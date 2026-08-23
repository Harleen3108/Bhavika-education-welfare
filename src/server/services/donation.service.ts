import "server-only";
import { customAlphabet } from "nanoid";
import { dbConnect } from "@/server/db/connect";
import {
  Donation,
  DonationCategory,
  User,
  type IDonation,
} from "@/server/models";
import { DonationStatus, DonationKind, DonationSource, UserRole } from "@/lib/enums";
import { DomainError } from "@/server/errors";
import { encryptPII, decryptPII } from "@/server/crypto/pii";
import { amountInWords } from "@/lib/amount-words";
import { getAppBaseUrl } from "@/lib/env";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  razorpayKeyId,
} from "./razorpay.service";
import { sendDonationReceiptEmail } from "./email.service";
import type { AdminDonationInput, DonateInput, DonationCategoryInput } from "@/lib/validation/donation";

const genToken = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz", 32);
const genReceiptDigits = customAlphabet("0123456789", 6);

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

export type CategoryDTO = {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  active: boolean;
  order: number;
};

export type DonationDTO = {
  id: string;
  userId: string | null;
  receiptNo: string | null;
  kind: string;
  status: string;
  source: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  anonymous: boolean;
  amount: number;
  categoryName: string;
  message: string;
  panLast4: string | null;
  paidAt: string | null;
  createdAt: string;
};

/** Everything the certificate PDF prints. */
export type CertificateData = {
  receiptNo: string;
  kind: string;
  donorName: string;
  amount: number;
  amountWords: string;
  categoryName: string;
  message: string;
  /** Full PAN, decrypted, or empty. Shown on the donor's own receipt. */
  pan: string;
  date: string;
};

/* ========================================================================== */
/*                                  Helpers                                   */
/* ========================================================================== */

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toDTO(d: IDonation): DonationDTO {
  return {
    id: d._id.toString(),
    userId: d.user ? d.user.toString() : null,
    receiptNo: d.receiptNo ?? null,
    kind: d.kind,
    status: d.status,
    source: d.source,
    donorName: d.donorName,
    donorEmail: d.donorEmail,
    donorPhone: d.donorPhone ?? "",
    anonymous: d.anonymous,
    amount: d.amount,
    categoryName: d.categoryName,
    message: d.message ?? "",
    panLast4: d.panLast4 ?? null,
    paidAt: d.paidAt ? d.paidAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
  };
}

async function allocateReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  for (let i = 0; i < 6; i++) {
    const candidate = `BF/${year}/${genReceiptDigits()}`;
    if (!(await Donation.exists({ receiptNo: candidate }))) return candidate;
  }
  throw new DomainError("Couldn't allocate a receipt number. Please try again.", 503, "ALLOC");
}

function panFields(pan: string | undefined) {
  const clean = (pan ?? "").trim().toUpperCase();
  if (!clean) return { panEnc: null, panLast4: null };
  return { panEnc: encryptPII(clean), panLast4: clean.slice(-4) };
}

async function notifyReceipt(d: IDonation): Promise<void> {
  try {
    if (!d.donorEmail || !d.receiptNo) return;
    const url = `${getAppBaseUrl()}/api/donations/${d._id.toString()}/receipt?t=${d.receiptToken}`;
    await sendDonationReceiptEmail(d.donorEmail, d.donorName, {
      receiptNo: d.receiptNo,
      amount: d.amount,
      cause: d.categoryName,
      kind: d.kind,
      url,
    });
  } catch (err) {
    console.error("[donation] receipt email failed:", err);
  }
}

/** If the donor already has an account, link the row so it shows in their dashboard. */
async function linkToAccountByEmail(d: IDonation): Promise<void> {
  if (d.user) return;
  const account = await User.findOne({ email: d.donorEmail }).select("_id").lean();
  if (account) {
    d.user = account._id;
  }
}

/* ========================================================================== */
/*                                 Categories                                 */
/* ========================================================================== */

function toCategoryDTO(c: {
  _id: { toString(): string };
  name: string;
  nameHi?: string;
  description?: string;
  active: boolean;
  order: number;
}): CategoryDTO {
  return {
    id: c._id.toString(),
    name: c.name,
    nameHi: c.nameHi ?? "",
    description: c.description ?? "",
    active: c.active,
    order: c.order,
  };
}

/** Causes a donor may choose from (active only), for the public form. */
export async function listActiveCategories(): Promise<CategoryDTO[]> {
  await dbConnect();
  const rows = await DonationCategory.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  return rows.map(toCategoryDTO);
}

export async function adminListCategories(): Promise<CategoryDTO[]> {
  await dbConnect();
  const rows = await DonationCategory.find({}).sort({ order: 1, name: 1 }).lean();
  return rows.map(toCategoryDTO);
}

export async function createCategory(input: DonationCategoryInput): Promise<CategoryDTO> {
  await dbConnect();
  const [row] = await DonationCategory.create([input]);
  return toCategoryDTO(row);
}

export async function updateCategory(id: string, input: DonationCategoryInput): Promise<void> {
  await dbConnect();
  const res = await DonationCategory.updateOne({ _id: id }, { $set: input });
  if (res.matchedCount === 0) throw new DomainError("That cause no longer exists.", 404, "NOT_FOUND");
}

export async function deleteCategory(id: string): Promise<void> {
  await dbConnect();
  await DonationCategory.deleteOne({ _id: id });
}

/* ========================================================================== */
/*                              Online donation                               */
/* ========================================================================== */

export type CreateDonationResult = {
  donationId: string;
  orderId: string;
  amountPaise: number;
  keyId: string;
  donor: { name: string; email: string; phone: string };
};

/**
 * Start an online donation: record a CREATED row and open a Razorpay order for
 * it. If the order can't be opened (misconfig, Razorpay down) the row is removed
 * so no orphaned CREATED donations accumulate.
 */
export async function createDonation(
  input: DonateInput,
  userId: string | null,
): Promise<CreateDonationResult> {
  await dbConnect();

  const category = await DonationCategory.findById(input.categoryId).lean();
  if (!category || !category.active) {
    throw new DomainError("Please choose a cause to donate to.", 400, "BAD_CAUSE");
  }

  const [created] = await Donation.create([
    {
      kind: DonationKind.DONATION,
      source: DonationSource.ONLINE,
      status: DonationStatus.CREATED,
      user: userId,
      donorName: input.name,
      donorEmail: input.email,
      donorPhone: input.phone || "",
      anonymous: Boolean(input.anonymous),
      ...panFields(input.pan),
      amount: input.amount,
      category: category._id,
      categoryName: category.name,
      message: input.message || "",
      receiptToken: genToken(),
    },
  ]);

  try {
    const order = await createRazorpayOrder({
      amountPaise: input.amount * 100,
      receipt: created._id.toString(),
      notes: { donationId: created._id.toString(), cause: category.name },
    });
    created.razorpayOrderId = order.id;
    await created.save();

    return {
      donationId: created._id.toString(),
      orderId: order.id,
      amountPaise: input.amount * 100,
      keyId: razorpayKeyId,
      donor: { name: input.name, email: input.email, phone: input.phone || "" },
    };
  } catch (err) {
    await Donation.deleteOne({ _id: created._id });
    throw err;
  }
}

/**
 * Verify a checkout callback and mark the donation paid — exactly once.
 *
 * The signature is the authority: it proves Razorpay captured a payment for
 * THIS order. Idempotent, so a double-submit or a webhook racing the callback
 * settles the same row once.
 */
export async function verifyAndComplete(input: {
  donationId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<{ donationId: string; receiptToken: string; receiptNo: string }> {
  await dbConnect();
  const donation = await Donation.findById(input.donationId);
  if (!donation) throw new DomainError("That donation could not be found.", 404, "NOT_FOUND");

  if (donation.status === DonationStatus.PAID) {
    return {
      donationId: donation._id.toString(),
      receiptToken: donation.receiptToken,
      receiptNo: donation.receiptNo ?? "",
    };
  }

  if (donation.razorpayOrderId !== input.orderId) {
    throw new DomainError("Payment does not match this donation.", 400, "ORDER_MISMATCH");
  }
  const ok = verifyPaymentSignature({
    orderId: input.orderId,
    paymentId: input.paymentId,
    signature: input.signature,
  });
  if (!ok) {
    donation.status = DonationStatus.FAILED;
    await donation.save();
    throw new DomainError("We couldn't verify that payment.", 400, "BAD_SIGNATURE");
  }

  donation.status = DonationStatus.PAID;
  donation.razorpayPaymentId = input.paymentId;
  donation.paidAt = new Date();
  donation.receiptNo = donation.receiptNo ?? (await allocateReceiptNo());
  await linkToAccountByEmail(donation);
  await donation.save();

  await notifyReceipt(donation);
  return {
    donationId: donation._id.toString(),
    receiptToken: donation.receiptToken,
    receiptNo: donation.receiptNo,
  };
}

/** Webhook path: settle a paid order even if the browser callback never lands. */
export async function markPaidByOrder(orderId: string, paymentId: string): Promise<void> {
  await dbConnect();
  const donation = await Donation.findOne({ razorpayOrderId: orderId });
  if (!donation || donation.status === DonationStatus.PAID) return;
  donation.status = DonationStatus.PAID;
  donation.razorpayPaymentId = paymentId;
  donation.paidAt = new Date();
  donation.receiptNo = donation.receiptNo ?? (await allocateReceiptNo());
  await linkToAccountByEmail(donation);
  await donation.save();
  await notifyReceipt(donation);
}

/* ========================================================================== */
/*                       Admin manual donation / volunteer                    */
/* ========================================================================== */

export async function adminRecordDonation(
  input: AdminDonationInput,
  adminId: string,
): Promise<DonationDTO> {
  await dbConnect();
  const category = await DonationCategory.findById(input.categoryId).lean();
  if (!category) throw new DomainError("Please choose a cause.", 400, "BAD_CAUSE");

  const account = await User.findOne({ email: input.email }).select("_id").lean();
  const receiptNo = await allocateReceiptNo();
  const now = new Date();

  const [row] = await Donation.create([
    {
      receiptNo,
      kind: input.kind,
      source: DonationSource.MANUAL,
      status: DonationStatus.PAID,
      user: account?._id ?? null,
      donorName: input.name,
      donorEmail: input.email,
      donorPhone: input.phone || "",
      anonymous: Boolean(input.anonymous),
      ...panFields(input.pan),
      amount: input.kind === DonationKind.VOLUNTEER ? 0 : input.amount,
      category: category._id,
      categoryName: category.name,
      message: input.message || "",
      receiptToken: genToken(),
      paidAt: now,
      createdBy: adminId,
    },
  ]);

  await notifyReceipt(row);
  return toDTO(row);
}

/* ========================================================================== */
/*                                  Reading                                   */
/* ========================================================================== */

/** A member's donations, matched by their account OR the email they gave as a guest. */
export async function getMyDonations(userId: string, email: string): Promise<DonationDTO[]> {
  await dbConnect();
  const rows = await Donation.find({
    status: DonationStatus.PAID,
    $or: [{ user: userId }, { donorEmail: email.toLowerCase() }],
  })
    .sort({ paidAt: -1, createdAt: -1 })
    .lean();
  return rows.map((r) => toDTO(r as IDonation));
}

/**
 * Load a paid donation's certificate data and authorise the requester: an
 * admin, the linked member, the email owner, or anyone holding the receipt
 * token from the emailed link.
 */
export async function getCertificateData(
  donationId: string,
  requester: { id?: string; email?: string; role?: string; token?: string },
): Promise<CertificateData> {
  await dbConnect();
  const d = await Donation.findById(donationId);
  if (!d) throw new DomainError("That receipt no longer exists.", 404, "NOT_FOUND");
  if (d.status !== DonationStatus.PAID || !d.receiptNo) {
    throw new DomainError("This receipt isn't available.", 403, "NOT_READY");
  }

  const isAdmin = requester.role === UserRole.ADMIN;
  const isOwner = Boolean(requester.id && d.user?.toString() === requester.id);
  const emailMatch = Boolean(
    requester.email && d.donorEmail === requester.email.toLowerCase(),
  );
  const tokenMatch = Boolean(requester.token && requester.token === d.receiptToken);
  if (!isAdmin && !isOwner && !emailMatch && !tokenMatch) {
    throw new DomainError("You can't download this receipt.", 403, "FORBIDDEN");
  }

  return {
    receiptNo: d.receiptNo,
    kind: d.kind,
    donorName: d.donorName,
    amount: d.amount,
    amountWords: amountInWords(d.amount),
    categoryName: d.categoryName,
    message: d.message ?? "",
    pan: d.panEnc ? decryptPII(d.panEnc) : "",
    date: fmtDate(d.paidAt ?? d.createdAt),
  };
}

/* ========================================================================== */
/*                                Admin listing                               */
/* ========================================================================== */

export type AdminDonationPage = {
  items: DonationDTO[];
  total: number;
  page: number;
  pages: number;
  totals: { paidCount: number; paidRupees: number; donorCount: number };
};

const PAGE = 20;

function escapeRegex(term: string): RegExp {
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

export async function adminListDonations(opts: {
  q?: string;
  status?: string;
  kind?: string;
  page?: number;
}): Promise<AdminDonationPage> {
  await dbConnect();
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (opts.status && Object.values(DonationStatus).includes(opts.status as DonationStatus)) {
    filter.status = opts.status;
  }
  if (opts.kind && Object.values(DonationKind).includes(opts.kind as DonationKind)) {
    filter.kind = opts.kind;
  }
  const term = opts.q?.trim();
  if (term) {
    const re = escapeRegex(term);
    filter.$or = [{ donorName: re }, { donorEmail: re }, { receiptNo: re }];
  }

  const [items, total, agg, donors] = await Promise.all([
    Donation.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    Donation.countDocuments(filter),
    Donation.aggregate<{ count: number; rupees: number }>([
      { $match: { status: DonationStatus.PAID, kind: DonationKind.DONATION } },
      { $group: { _id: null, count: { $sum: 1 }, rupees: { $sum: "$amount" } } },
    ]),
    Donation.distinct("donorEmail", { status: DonationStatus.PAID }),
  ]);

  return {
    items: items.map((d) => toDTO(d as IDonation)),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
    totals: {
      paidCount: agg[0]?.count ?? 0,
      paidRupees: agg[0]?.rupees ?? 0,
      donorCount: donors.length,
    },
  };
}

/** Decrypt a donation's full PAN. Admin-only; callers must audit. */
export async function adminRevealPan(donationId: string): Promise<string | null> {
  await dbConnect();
  const d = await Donation.findById(donationId).select("panEnc").lean();
  if (!d) return null;
  return d.panEnc ? decryptPII(d.panEnc) : "";
}
