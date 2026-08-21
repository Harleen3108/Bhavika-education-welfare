import "server-only";
import { customAlphabet } from "nanoid";
import { dbConnect } from "@/server/db/connect";
import { IdCard, User, type IIdCard } from "@/server/models";
import { IdCardStatus, UserRole } from "@/lib/enums";
import { DomainError } from "@/server/errors";
import { encryptPII, decryptPII } from "@/server/crypto/pii";
import { maskAadhaar, maskPan, type IdCardSubmitInput } from "@/lib/validation/idcard";
import { setAvatarUrl } from "./user.service";
import { sendIdCardApprovedEmail } from "./email.service";
import { env } from "@/lib/env";

/** How long an issued card stays valid. Two years, then it should be renewed. */
const VALIDITY_DAYS = 730;
const DAY_MS = 86_400_000;

const genSerial = customAlphabet("0123456789", 6);

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

export type IdCardDTO = {
  id: string;
  status: IdCardStatus;
  memberId: string | null;
  fullName: string;
  fatherName: string;
  address: string;
  city: string;
  photoUrl: string;
  /** Masked for display — never the full number. */
  aadhaarMasked: string;
  panMasked: string;
  rejectionReason: string | null;
  issuedByAdmin: boolean;
  approvedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  canDownload: boolean;
};

/** The exact fields the PDF renderer prints. No Aadhaar/PAN, by decision. */
export type IdCardPrint = {
  memberId: string;
  fullName: string;
  fatherName: string;
  city: string;
  address: string;
  photoUrl: string;
  issuedOn: string;
  validUntil: string;
};

/* ========================================================================== */
/*                                  Helpers                                   */
/* ========================================================================== */

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDTO(card: IIdCard): IdCardDTO {
  return {
    id: card._id.toString(),
    status: card.status,
    memberId: card.memberId ?? null,
    fullName: card.fullName,
    fatherName: card.fatherName,
    address: card.address,
    city: card.city,
    photoUrl: card.photoUrl,
    aadhaarMasked: maskAadhaar(card.aadhaarLast4),
    panMasked: maskPan(card.panLast4),
    rejectionReason: card.rejectionReason ?? null,
    issuedByAdmin: card.issuedByAdmin,
    approvedAt: card.approvedAt ? card.approvedAt.toISOString() : null,
    expiresAt: card.expiresAt ? card.expiresAt.toISOString() : null,
    createdAt: card.createdAt.toISOString(),
    canDownload: card.status === IdCardStatus.APPROVED,
  };
}

/**
 * A card number that is not already taken. The unique index on `memberId` is
 * the real guarantee; this pre-check keeps the common path clean. Fails loudly
 * after several misses rather than minting a duplicate.
 */
async function allocateMemberId(): Promise<string> {
  const year = new Date().getFullYear();
  for (let i = 0; i < 6; i++) {
    const candidate = `BHAV-${year}-${genSerial()}`;
    const exists = await IdCard.exists({ memberId: candidate });
    if (!exists) return candidate;
  }
  throw new DomainError("Couldn't allocate a card number. Please try again.", 503, "ALLOC");
}

function encryptFor(aadhaar: string, pan: string) {
  return {
    aadhaarEnc: encryptPII(aadhaar),
    panEnc: encryptPII(pan),
    aadhaarLast4: aadhaar.slice(-4),
    panLast4: pan.slice(-4),
  };
}

/* ========================================================================== */
/*                                Member side                                 */
/* ========================================================================== */

/** The member's own card, or null if they have never requested one. */
export async function getMyCard(userId: string): Promise<IdCardDTO | null> {
  await dbConnect();
  const card = await IdCard.findOne({ user: userId });
  return card ? toDTO(card) : null;
}

/** Everything the member's ID-card page needs in one round trip. */
export async function getMyContext(
  userId: string,
): Promise<{ card: IdCardDTO | null; name: string; avatarUrl: string }> {
  await dbConnect();
  const [card, user] = await Promise.all([
    IdCard.findOne({ user: userId }),
    User.findById(userId).select("name avatarUrl").lean(),
  ]);
  return {
    card: card ? toDTO(card) : null,
    name: user?.name ?? "Member",
    avatarUrl: user?.avatarUrl ?? "",
  };
}

/**
 * Submit (or resubmit after a rejection) a KYC request.
 *
 * The photo is the member's profile avatar, snapshotted here — so "upload a
 * photo" and "save it to the profile" are the same action, and a member with no
 * avatar is told to add one first. An already-APPROVED card is not overwritten.
 */
export async function submitCard(userId: string, input: IdCardSubmitInput): Promise<IdCardDTO> {
  await dbConnect();

  const user = await User.findById(userId).select("name city avatarUrl").lean();
  if (!user) throw new DomainError("Your account could not be found.", 404, "NO_USER");
  if (!user.avatarUrl) {
    throw new DomainError(
      "Add a profile photo first — it becomes the photo on your ID card.",
      400,
      "NO_PHOTO",
    );
  }

  const existing = await IdCard.findOne({ user: userId });
  if (existing && existing.status === IdCardStatus.APPROVED) {
    throw new DomainError("You already have an approved ID card.", 409, "ALREADY_ISSUED");
  }

  const enc = encryptFor(input.aadhaar, input.pan);
  const fields = {
    user: userId,
    status: IdCardStatus.PENDING,
    fullName: user.name,
    fatherName: input.fatherName,
    address: input.address,
    city: user.city ?? "",
    photoUrl: user.avatarUrl,
    ...enc,
    issuedByAdmin: false,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
  };

  const card = await IdCard.findOneAndUpdate(
    { user: userId },
    { $set: fields, $setOnInsert: { memberId: null } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return toDTO(card);
}

/* ========================================================================== */
/*                                 Admin side                                 */
/* ========================================================================== */

export type AdminIdCardRow = {
  id: string;
  userId: string;
  member: string;
  email: string;
  status: IdCardStatus;
  memberId: string | null;
  fatherName: string;
  city: string;
  photoUrl: string;
  aadhaarMasked: string;
  panMasked: string;
  issuedByAdmin: boolean;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AdminIdCardPage = {
  items: AdminIdCardRow[];
  total: number;
  page: number;
  pages: number;
  counts: { pending: number; approved: number; rejected: number };
};

const PAGE = 20;

function escapeRegex(term: string): RegExp {
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** The admin review queue, filtered and paginated, with status tallies. */
export async function adminListCards(opts: {
  q?: string;
  status?: string;
  page?: number;
}): Promise<AdminIdCardPage> {
  await dbConnect();
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (opts.status && Object.values(IdCardStatus).includes(opts.status as IdCardStatus)) {
    filter.status = opts.status;
  }

  const term = opts.q?.trim();
  if (term) {
    const re = escapeRegex(term);
    const members = await User.find({ $or: [{ name: re }, { email: re }] })
      .select("_id")
      .limit(500)
      .lean();
    filter.$or = [
      { memberId: re },
      { fullName: re },
      { user: { $in: members.map((m) => m._id) } },
    ];
  }

  const [docs, total, pending, approved, rejected] = await Promise.all([
    IdCard.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    IdCard.countDocuments(filter),
    IdCard.countDocuments({ status: IdCardStatus.PENDING }),
    IdCard.countDocuments({ status: IdCardStatus.APPROVED }),
    IdCard.countDocuments({ status: IdCardStatus.REJECTED }),
  ]);

  const userIds = [...new Map(docs.map((d) => [d.user.toString(), d.user])).values()];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("name email").lean()
    : [];
  const byId = new Map(users.map((u) => [u._id.toString(), u]));

  return {
    items: docs.map((c) => {
      const owner = byId.get(c.user.toString());
      return {
        id: c._id.toString(),
        userId: owner ? owner._id.toString() : "",
        member: owner?.name ?? c.fullName ?? "Deleted member",
        email: owner?.email ?? "",
        status: c.status,
        memberId: c.memberId ?? null,
        fatherName: c.fatherName,
        city: c.city,
        photoUrl: c.photoUrl,
        aadhaarMasked: maskAadhaar(c.aadhaarLast4),
        panMasked: maskPan(c.panLast4),
        issuedByAdmin: c.issuedByAdmin,
        rejectionReason: c.rejectionReason ?? null,
        createdAt: c.createdAt.toISOString(),
        reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null,
      };
    }),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
    counts: { pending, approved, rejected },
  };
}

/** Decrypt the full Aadhaar/PAN for one card. Admin-only; callers must audit. */
export async function adminRevealCard(
  cardId: string,
): Promise<{ aadhaar: string; pan: string } | null> {
  await dbConnect();
  const card = await IdCard.findById(cardId).select("aadhaarEnc panEnc").lean();
  if (!card) return null;
  return { aadhaar: decryptPII(card.aadhaarEnc), pan: decryptPII(card.panEnc) };
}

/** Approve a pending card: allot its number, stamp validity, email the member. */
export async function approveCard(cardId: string, adminId: string): Promise<IdCardDTO> {
  await dbConnect();
  const card = await IdCard.findById(cardId);
  if (!card) throw new DomainError("That card request no longer exists.", 404, "NOT_FOUND");
  if (card.status === IdCardStatus.APPROVED) {
    throw new DomainError("That card is already approved.", 409, "ALREADY");
  }

  if (!card.memberId) card.memberId = await allocateMemberId();
  const now = new Date();
  card.status = IdCardStatus.APPROVED;
  card.approvedAt = now;
  card.expiresAt = new Date(now.getTime() + VALIDITY_DAYS * DAY_MS);
  card.reviewedBy = adminId as unknown as IIdCard["reviewedBy"];
  card.reviewedAt = now;
  card.rejectionReason = null;
  await card.save();

  await notifyApproved(card);
  return toDTO(card);
}

/** Decline a pending card with a reason the member will see. */
export async function rejectCard(
  cardId: string,
  adminId: string,
  reason: string,
): Promise<IdCardDTO> {
  await dbConnect();
  const card = await IdCard.findById(cardId);
  if (!card) throw new DomainError("That card request no longer exists.", 404, "NOT_FOUND");
  if (card.status === IdCardStatus.APPROVED) {
    throw new DomainError("An approved card can't be rejected. Contact the member instead.", 409, "APPROVED");
  }
  card.status = IdCardStatus.REJECTED;
  card.reviewedBy = adminId as unknown as IIdCard["reviewedBy"];
  card.reviewedAt = new Date();
  card.rejectionReason = reason || "Details could not be verified.";
  await card.save();
  return toDTO(card);
}

/**
 * Admin creates an already-approved card on a member's behalf (allotment).
 *
 * For a member who cannot fill the form themselves. The photo is the one the
 * admin supplies, or the member's existing avatar; when the admin supplies one
 * and the member has none, it is also saved to their profile.
 */
export async function adminIssueCard(input: {
  userId: string;
  fatherName: string;
  address: string;
  aadhaar: string;
  pan: string;
  photoUrl?: string;
  adminId: string;
}): Promise<IdCardDTO> {
  await dbConnect();
  const user = await User.findById(input.userId).select("name city avatarUrl").lean();
  if (!user) throw new DomainError("That member no longer exists.", 404, "NO_USER");

  const photo = input.photoUrl?.trim() || user.avatarUrl || "";
  if (input.photoUrl?.trim() && !user.avatarUrl) {
    // Persist the admin-supplied photo to the member's profile too.
    await setAvatarUrl(input.userId, input.photoUrl.trim());
  }

  const existing = await IdCard.findOne({ user: input.userId });
  const memberId = existing?.memberId ?? (await allocateMemberId());
  const now = new Date();
  const enc = encryptFor(input.aadhaar, input.pan);

  const card = await IdCard.findOneAndUpdate(
    { user: input.userId },
    {
      $set: {
        status: IdCardStatus.APPROVED,
        memberId,
        fullName: user.name,
        fatherName: input.fatherName,
        address: input.address,
        city: user.city ?? "",
        photoUrl: photo,
        ...enc,
        issuedByAdmin: true,
        reviewedBy: input.adminId,
        reviewedAt: now,
        rejectionReason: null,
        approvedAt: now,
        expiresAt: new Date(now.getTime() + VALIDITY_DAYS * DAY_MS),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await notifyApproved(card);
  return toDTO(card);
}

/** The print payload for an APPROVED card, or throws if it is not downloadable. */
function getCardForRender(card: IIdCard): IdCardPrint {
  if (card.status !== IdCardStatus.APPROVED || !card.memberId) {
    throw new DomainError("This ID card isn't available for download yet.", 403, "NOT_READY");
  }
  return {
    memberId: card.memberId,
    fullName: card.fullName,
    fatherName: card.fatherName,
    city: card.city,
    address: card.address,
    photoUrl: card.photoUrl,
    issuedOn: fmtDate(card.approvedAt),
    validUntil: fmtDate(card.expiresAt),
  };
}

/**
 * Load a card for download and authorise the caller: its owner, or any admin.
 * Returns the print payload, or throws a DomainError the route can surface.
 */
export async function getDownloadableCard(
  cardId: string,
  requester: { id: string; role: string },
): Promise<IdCardPrint> {
  await dbConnect();
  const card = await IdCard.findById(cardId);
  if (!card) throw new DomainError("That ID card no longer exists.", 404, "NOT_FOUND");
  const isOwner = card.user.toString() === requester.id;
  const isAdmin = requester.role === UserRole.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new DomainError("You can't download this ID card.", 403, "FORBIDDEN");
  }
  return getCardForRender(card);
}

/* ------------------------------------------------------------------------- */

async function notifyApproved(card: IIdCard): Promise<void> {
  try {
    const user = await User.findById(card.user).select("name email").lean();
    if (!user?.email) return;
    const url = `${env.SITE_URL || "http://localhost:3000"}/dashboard/id-card`;
    await sendIdCardApprovedEmail(user.email, user.name, card.memberId ?? "", url);
  } catch (err) {
    console.error("[idcard] approval email failed:", err);
  }
}
