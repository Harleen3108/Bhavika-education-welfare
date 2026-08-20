import "server-only";
import { Types } from "mongoose";
import { fromZonedTime } from "date-fns-tz";
import { dbConnect } from "@/server/db/connect";
import {
  GalleryItem,
  Video,
  Testimonial,
  Partner,
  Content,
  Quiz,
  QuizAttempt,
  User,
  Wallet,
  WalletTransaction,
  Referral,
  ContactSubmission,
  SystemSettings,
  Coupon,
} from "@/server/models";
import { DEFAULT_SETTINGS, SITE } from "@/lib/constants";
import { CouponStatus } from "@/lib/enums";
import { isCouponCode, normalizeCouponCode } from "@/lib/validation/coupon";
import { DEFAULT_ABOUT, DEFAULT_MISSION_VISION, DEFAULT_CONTACT, CONTENT_KEYS } from "@/lib/defaults";

const PAGE = 20;

function id<T extends { _id: { toString(): string } }>(d: T) {
  return d._id.toString();
}

/**
 * Admin search terms go straight into `$regex`, so they have to be escaped:
 * an unbalanced "(" typed into the search box would otherwise throw, and a
 * pathological pattern would pin the database on a full collection scan.
 */
function searchRegex(term: string): RegExp {
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/**
 * Turn a `YYYY-MM-DD` filter into an instant. Boundaries are resolved in the
 * foundation's timezone, so "17 Aug" in the admin's date picker means the Indian
 * day the members actually lived through, not a UTC window shifted by 5.5 hours.
 */
function dayBoundary(value: string | undefined, edge: "start" | "end"): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const wall = `${value}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}`;
  const d = fromZonedTime(wall, SITE.timezone);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A filter value that is safe in an aggregation pipeline.
 *
 * `find()` casts a 24-hex string to an ObjectId from the schema; `aggregate()`
 * does not — the pipeline is sent to the server verbatim. A filter shared
 * between the two therefore has to carry a real ObjectId, or the `$match`
 * silently matches nothing while the `find()` beside it returns rows.
 */
function objectId(value: string): Types.ObjectId | null {
  return /^[a-f\d]{24}$/i.test(value) ? new Types.ObjectId(value) : null;
}

// ---- Simple content collections (all items, admin view) ----
export async function adminListGallery() {
  await dbConnect();
  const items = await GalleryItem.find({}).sort({ order: 1, createdAt: -1 }).lean();
  return items.map((i) => ({
    id: id(i),
    title: i.title,
    description: i.description ?? "",
    category: i.category ?? "",
    imageUrl: i.imageUrl,
    publicId: i.publicId ?? "",
    order: i.order,
    active: i.active,
  }));
}

export async function adminListVideos() {
  await dbConnect();
  const items = await Video.find({}).sort({ order: 1, createdAt: -1 }).lean();
  return items.map((i) => ({
    id: id(i),
    title: i.title,
    description: i.description ?? "",
    category: i.category ?? "",
    videoUrl: i.videoUrl,
    thumbnailUrl: i.thumbnailUrl ?? "",
    order: i.order,
    active: i.active,
  }));
}

export async function adminListTestimonials() {
  await dbConnect();
  const items = await Testimonial.find({}).sort({ order: 1, createdAt: -1 }).lean();
  return items.map((i) => ({
    id: id(i),
    name: i.name,
    role: i.role ?? "",
    message: i.message,
    imageUrl: i.imageUrl ?? "",
    order: i.order,
    active: i.active,
  }));
}

export async function adminListPartners() {
  await dbConnect();
  const items = await Partner.find({}).sort({ order: 1, createdAt: -1 }).lean();
  return items.map((i) => ({
    id: id(i),
    name: i.name,
    description: i.description ?? "",
    logoUrl: i.logoUrl ?? "",
    websiteUrl: i.websiteUrl ?? "",
    order: i.order,
    active: i.active,
  }));
}

// ---- CMS text ----
export async function adminGetContent(key: string) {
  await dbConnect();
  const doc = await Content.findOne({ key }).lean();
  const fallback =
    key === CONTENT_KEYS.about
      ? DEFAULT_ABOUT
      : key === CONTENT_KEYS.missionVision
        ? DEFAULT_MISSION_VISION
        : DEFAULT_CONTACT;
  return { ...(fallback as Record<string, unknown>), ...((doc?.data as Record<string, unknown>) ?? {}) };
}

// ---- Quizzes ----
export async function adminListQuizzes() {
  await dbConnect();
  const quizzes = await Quiz.find({}).sort({ createdAt: -1 }).lean();
  const withCounts = await Promise.all(
    quizzes.map(async (q) => ({
      id: id(q),
      title: q.title,
      slug: q.slug,
      type: q.type,
      status: q.status,
      questionCount: q.questions.length,
      startAt: q.startAt.toISOString(),
      endAt: q.endAt.toISOString(),
      attempts: await QuizAttempt.countDocuments({ quiz: q._id }),
    })),
  );
  return withCounts;
}

export async function adminGetQuiz(quizId: string) {
  await dbConnect();
  const q = await Quiz.findById(quizId).lean();
  if (!q) return null;
  return {
    id: id(q),
    title: q.title,
    slug: q.slug,
    description: q.description ?? "",
    type: q.type,
    status: q.status,
    startAt: q.startAt.toISOString(),
    endAt: q.endAt.toISOString(),
    timeLimitSeconds: q.timeLimitSeconds,
    maxAttempts: q.maxAttempts,
    questions: q.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((qq) => ({
        id: (qq._id as { toString(): string }).toString(),
        text: qq.text,
        imageUrl: qq.imageUrl ?? "",
        options: qq.options,
        correctIndex: qq.correctIndex,
        points: qq.points,
        order: qq.order,
      })),
  };
}

// ---- Users ----
export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  status: string;
  emailVerified: boolean;
  referralCode: string;
  /** Who invited this member (null when they signed up on their own). */
  referredBy: { id: string; name: string; code: string } | null;
  /** How many members this one has invited. */
  referredCount: number;
  points: number;
  createdAt: string;
};

export type AdminUserPage = {
  items: AdminUserRow[];
  total: number;
  page: number;
  pages: number;
};

export async function adminListUsers(opts: {
  q?: string;
  status?: string;
  role?: string;
  page?: number;
}): Promise<AdminUserPage> {
  await dbConnect();
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.role) filter.role = opts.role;

  const term = opts.q?.trim();
  if (term) {
    const re = searchRegex(term);
    filter.$or = [
      { name: re },
      { email: re },
      { referralCode: term.toUpperCase() },
      { referralCodeUsed: term.toUpperCase() },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    User.countDocuments(filter),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE));
  if (users.length === 0) return { items: [], total, page, pages };

  /*
    Referral attribution and balances are resolved with three batched queries
    rather than three per row: a full page would otherwise cost 60 round trips
    and get slower as the page size grows.
  */
  const ids = users.map((u) => u._id);
  const referrerIds = [
    ...new Map(
      users.filter((u) => u.referrer).map((u) => [u.referrer!.toString(), u.referrer!]),
    ).values(),
  ];

  const [referrers, referredCounts, wallets] = await Promise.all([
    User.find({ _id: { $in: referrerIds } }).select("name referralCode").lean(),
    Referral.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { referrer: { $in: ids } } },
      { $group: { _id: "$referrer", count: { $sum: 1 } } },
    ]),
    Wallet.find({ user: { $in: ids } }).select("user totalBalance").lean(),
  ]);

  const referrerById = new Map(referrers.map((r) => [r._id.toString(), r]));
  const countByReferrer = new Map(referredCounts.map((c) => [c._id.toString(), c.count]));
  const balanceByUser = new Map(wallets.map((w) => [w.user.toString(), w.totalBalance]));

  return {
    items: users.map((u) => {
      const referrer = u.referrer ? referrerById.get(u.referrer.toString()) : null;
      return {
        id: id(u),
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl ?? "",
        role: u.role,
        status: u.status,
        emailVerified: Boolean(u.emailVerified),
        referralCode: u.referralCode,
        referredBy: referrer
          ? { id: referrer._id.toString(), name: referrer.name, code: referrer.referralCode }
          : null,
        referredCount: countByReferrer.get(id(u)) ?? 0,
        points: balanceByUser.get(id(u)) ?? 0,
        createdAt: u.createdAt.toISOString(),
      };
    }),
    total,
    page,
    pages,
  };
}

/**
 * Typeahead for the wallet adjustment picker. Deliberately narrow: enough to
 * identify the right member (and see what they hold) and nothing more.
 */
export async function adminSearchMembers(q: string, limit = 8) {
  await dbConnect();
  const term = q.trim();
  if (term.length < 2) return [];

  const re = searchRegex(term);
  const users = await User.find({
    $or: [{ name: re }, { email: re }, { referralCode: term.toUpperCase() }],
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 20))
    .select("name email referralCode status avatarUrl")
    .lean();
  if (users.length === 0) return [];

  const wallets = await Wallet.find({ user: { $in: users.map((u) => u._id) } })
    .select("user totalBalance")
    .lean();
  const balanceByUser = new Map(wallets.map((w) => [w.user.toString(), w.totalBalance]));

  return users.map((u) => ({
    id: id(u),
    name: u.name,
    email: u.email,
    referralCode: u.referralCode,
    status: u.status,
    avatarUrl: u.avatarUrl ?? "",
    balance: balanceByUser.get(id(u)) ?? 0,
  }));
}

export type AdminMemberBrief = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  status: string;
  avatarUrl: string;
  balance: number;
};

/**
 * The same shape the typeahead returns, for one known member. The wallet page
 * uses it to name the member a `?userId=` filter is pinned to — including when
 * that member has no transactions yet and the ledger rows cannot supply a name.
 */
export async function adminGetMemberBrief(userId: string): Promise<AdminMemberBrief | null> {
  if (!objectId(userId)) return null;
  await dbConnect();
  const user = await User.findById(userId).select("name email referralCode status avatarUrl").lean();
  if (!user) return null;
  const wallet = await Wallet.findOne({ user: user._id }).select("totalBalance").lean();
  return {
    id: id(user),
    name: user.name,
    email: user.email,
    referralCode: user.referralCode,
    status: user.status,
    avatarUrl: user.avatarUrl ?? "",
    balance: wallet?.totalBalance ?? 0,
  };
}

export async function adminGetUserDetail(userId: string) {
  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) return null;

  /*
    Both directions of the referral graph in one round: `referrer` on the user
    document answers "who invited them", the Referral row behind it carries the
    reward state, and the Referral rows pointing at them answer "who have they
    invited". The inbound lookup is skipped entirely for a member who joined on
    their own.
  */
  const [wallet, attempts, referralsMade, txns, inboundReferral, referredByUser] =
    await Promise.all([
      Wallet.findOne({ user: userId }).lean(),
      QuizAttempt.find({ user: userId, status: { $ne: "IN_PROGRESS" } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate<{ quiz: { title: string } }>("quiz", "title")
        .lean(),
      Referral.find({ referrer: userId })
        .sort({ createdAt: -1 })
        .populate<{ referredUser: { _id: Types.ObjectId; name: string; email: string } }>(
          "referredUser",
          "name email",
        )
        .lean(),
      WalletTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(12).lean(),
      Referral.findOne({ referredUser: userId }).lean(),
      user.referrer
        ? User.findById(user.referrer).select("name email referralCode status").lean()
        : Promise.resolve(null),
    ]);

  const rewardedReferrals = referralsMade.filter((r) => r.status === "REWARDED");

  return {
    id: id(user),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? "",
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerified),
    redemptionBlocked: Boolean(user.redemptionBlocked),
    phone: user.phone ?? "",
    city: user.city ?? "",
    referralCode: user.referralCode,
    /** The raw code typed at signup — kept even if the referrer is later removed. */
    referralCodeUsed: user.referralCodeUsed ?? "",
    createdAt: user.createdAt.toISOString(),
    wallet: {
      total: wallet?.totalBalance ?? 0,
      quiz: wallet?.quizBalance ?? 0,
      referral: wallet?.referralBalance ?? 0,
      activity: wallet?.activityBalance ?? 0,
    },
    referredBy: referredByUser
      ? {
          id: referredByUser._id.toString(),
          name: referredByUser.name,
          email: referredByUser.email,
          code: referredByUser.referralCode,
          status: inboundReferral?.status ?? null,
          rewardPoints: inboundReferral?.rewardPoints ?? 0,
        }
      : null,
    referralStats: {
      total: referralsMade.length,
      rewarded: rewardedReferrals.length,
      pointsEarned: rewardedReferrals.reduce((sum, r) => sum + (r.rewardPoints ?? 0), 0),
    },
    quizHistory: attempts.map((a) => ({
      id: a._id.toString(),
      quiz: a.quiz?.title ?? "Quiz",
      score: a.score,
      status: a.status,
      date: a.createdAt.toISOString(),
    })),
    referrals: referralsMade.map((r) => ({
      id: r._id.toString(),
      userId: r.referredUser?._id?.toString() ?? "",
      name: r.referredUser?.name ?? "Member",
      email: r.referredUser?.email ?? "",
      status: r.status,
      joinedAt: r.createdAt.toISOString(),
      rewardPoints: r.rewardPoints ?? 0,
    })),
    transactions: txns.map((t) => ({
      id: t._id.toString(),
      source: t.source,
      type: t.type,
      points: t.points,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

// ---- Wallet monitoring ----
export type AdminTxnFilters = {
  /** Member search: name, email or referral code. */
  q?: string;
  /** Exact member — takes precedence over `q`. */
  userId?: string;
  source?: string;
  type?: string;
  /** Inclusive `YYYY-MM-DD` bounds, read in IST. */
  from?: string;
  to?: string;
  page?: number;
};

/**
 * The complete ledger, filtered and paginated. `balanceAfter` is stored on each
 * row by the ledger primitive itself, so the running balance shown here is the
 * balance the member actually had at that moment — never a re-derived guess.
 */
export async function adminListTransactions(opts: AdminTxnFilters) {
  await dbConnect();
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (opts.source) filter.source = opts.source;
  if (opts.type) filter.type = opts.type;

  if (opts.userId) {
    /*
      A malformed id narrows to nothing rather than falling back to the whole
      ledger: a filter that quietly stops filtering is how an admin ends up
      reading someone else's balance as if it were the member they picked.
    */
    filter.user = objectId(opts.userId) ?? { $in: [] };
  } else {
    const term = opts.q?.trim();
    if (term) {
      // Resolve the member search to ids first: one indexed ledger query beats
      // populating every transaction just to filter it away afterwards.
      const re = searchRegex(term);
      const matches = await User.find({
        $or: [{ name: re }, { email: re }, { referralCode: term.toUpperCase() }],
      })
        .select("_id")
        .limit(500)
        .lean();
      filter.user = { $in: matches.map((m) => m._id) };
    }
  }

  const from = dayBoundary(opts.from, "start");
  const to = dayBoundary(opts.to, "end");
  if (from || to) {
    filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }

  const [items, total, sums] = await Promise.all([
    WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE)
      .limit(PAGE)
      .populate<{ user: { _id: Types.ObjectId; name: string; email: string } }>(
        "user",
        "name email",
      )
      .lean(),
    WalletTransaction.countDocuments(filter),
    WalletTransaction.aggregate<{ credited: number; debited: number }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          credited: { $sum: { $cond: [{ $gt: ["$points", 0] }, "$points", 0] } },
          debited: { $sum: { $cond: [{ $lt: ["$points", 0] }, { $abs: "$points" }, 0] } },
        },
      },
    ]),
  ]);

  const credited = sums[0]?.credited ?? 0;
  const debited = sums[0]?.debited ?? 0;

  return {
    items: items.map((t) => ({
      id: t._id.toString(),
      userId: t.user?._id?.toString() ?? "",
      user: t.user?.name ?? "Deleted member",
      email: t.user?.email ?? "",
      source: t.source,
      type: t.type,
      points: t.points,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    totals: { credited, debited, net: credited - debited },
    total,
    page,
    pageSize: PAGE,
    pages: Math.max(1, Math.ceil(total / PAGE)),
  };
}

// ---- Coupons ----

/**
 * Rows one CSV export may pull. The UI never asks for more than `PAGE`; this
 * caps the export so a filter matching the whole collection cannot try to
 * serialise it into memory in one response.
 */
const COUPON_EXPORT_MAX = 5000;

export type AdminCouponRow = {
  id: string;
  code: string;
  /** Empty when the member's account no longer exists. */
  userId: string;
  member: string;
  email: string;
  valueRupees: number;
  pointsSpent: number;
  /**
   * EFFECTIVE status, matching `CouponDTO.status` in coupon.service: a stored
   * ACTIVE row whose `expiresAt` has passed reports EXPIRED. Nothing schedules
   * the expiry sweep yet, so reading the stored status directly would count
   * long-dead coupons as live liability.
   */
  status: string;
  source: string;
  issuedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  /** Set when an admin refunded the points on a void or force-expire. */
  refundedAt: string | null;
  /** The partner store's order id — only ever set on a redeemed coupon. */
  externalRef: string | null;
  /** Whole days before forfeit. 0 once redeemed or expired. */
  daysRemaining: number;
};

/**
 * Coupon economics at a glance.
 *
 * `activeRupees` is the one that matters financially: the face value of every
 * coupon that is still usable today, i.e. what the partner store could still
 * present for settlement. Redeemed value is already spent, and expired value is
 * forfeited — neither is owed — so only the active band is a liability.
 */
export type AdminCouponTotals = {
  activeCount: number;
  /** OUTSTANDING LIABILITY — Σ valueRupees where effective status is ACTIVE. */
  activeRupees: number;
  /** Points members have already paid for that outstanding liability. */
  activePoints: number;
  redeemedCount: number;
  redeemedRupees: number;
  expiredCount: number;
  expiredRupees: number;
  /**
   * Points spent on coupons that lapsed unused AND were not refunded. An
   * admin-forced expiry refunds the points, so it is excluded here — otherwise
   * the forfeit figure would double-count money that went back to the member.
   */
  forfeitedPoints: number;
  /** Admin-deactivated coupons — off the liability, points already returned. */
  voidedCount: number;
  voidedRupees: number;
};

export type AdminCouponFilters = {
  /** Coupon code, store order reference, or member name / email / referral code. */
  q?: string;
  /** Effective status, not stored status. */
  status?: string;
  page?: number;
  /** Rows per page. Raised by the CSV export; the console leaves it at `PAGE`. */
  pageSize?: number;
};

export type AdminCouponPage = {
  items: AdminCouponRow[];
  totals: AdminCouponTotals;
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

type CouponTotalsAgg = {
  activeCount: number;
  activeRupees: number;
  activePoints: number;
  redeemedCount: number;
  redeemedRupees: number;
  expiredCount: number;
  expiredRupees: number;
  forfeitedPoints: number;
  voidedCount: number;
  voidedRupees: number;
};

const ZERO_COUPON_TOTALS: AdminCouponTotals = {
  activeCount: 0,
  activeRupees: 0,
  activePoints: 0,
  redeemedCount: 0,
  redeemedRupees: 0,
  expiredCount: 0,
  expiredRupees: 0,
  forfeitedPoints: 0,
  voidedCount: 0,
  voidedRupees: 0,
};

const DAY_MS = 86_400_000;

/**
 * A query fragment selecting one EFFECTIVE status.
 *
 * The expiry sweep is what eventually writes EXPIRED to the document, so until
 * it runs (and nothing schedules it yet) a lapsed coupon is still stored as
 * ACTIVE. Every filter here therefore reads the clock, not just the field —
 * otherwise "Active" would list coupons no shopkeeper would accept.
 */
function couponStatusFilter(status: string, now: Date): Record<string, unknown> | null {
  if (status === CouponStatus.ACTIVE) {
    return { status: CouponStatus.ACTIVE, expiresAt: { $gt: now } };
  }
  if (status === CouponStatus.REDEEMED) return { status: CouponStatus.REDEEMED };
  if (status === CouponStatus.EXPIRED) {
    return {
      $or: [
        { status: CouponStatus.EXPIRED },
        { status: CouponStatus.ACTIVE, expiresAt: { $lte: now } },
      ],
    };
  }
  // VOID is a stored status the clock never touches — an admin set it.
  if (status === CouponStatus.VOID) return { status: CouponStatus.VOID };
  return null;
}

/**
 * Resolve the search box to a query fragment.
 *
 * A complete code short-circuits to an exact match on the unique index — the
 * admin pastes `bhav 7k2x9qm4 p8rt` off a support ticket in whatever shape it
 * arrived, and `normalizeCouponCode` turns every one of those into the stored
 * form. Anything else is a substring hunt across the code, the store's order
 * reference (how a reconciliation query arrives) and the member.
 */
async function couponSearchFilter(term: string): Promise<Record<string, unknown>> {
  const normalized = normalizeCouponCode(term);
  if (isCouponCode(normalized)) return { code: normalized };

  const re = searchRegex(term);
  // Members are resolved to ids first: one indexed coupon query beats joining
  // every coupon to its owner just to throw most of them away.
  const members = await User.find({
    $or: [{ name: re }, { email: re }, { referralCode: term.toUpperCase() }],
  })
    .select("_id")
    .limit(500)
    .lean();

  return {
    $or: [{ code: re }, { externalRef: re }, { user: { $in: members.map((m) => m._id) } }],
  };
}

/**
 * The coupon ledger, filtered and paginated, with the totals an admin would
 * otherwise have to add up by hand.
 *
 * The totals deliberately ignore the STATUS filter while honouring the search:
 * they are a breakdown *by* status, so applying the status filter to them would
 * zero two of the three bands and make the liability figure disappear exactly
 * when an admin narrows to "Redeemed" to investigate something.
 */
export async function adminListCoupons(opts: AdminCouponFilters): Promise<AdminCouponPage> {
  await dbConnect();
  const now = new Date();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(Math.max(1, opts.pageSize ?? PAGE), COUPON_EXPORT_MAX);

  const term = opts.q?.trim();
  const search = term ? await couponSearchFilter(term) : null;
  const status = opts.status ? couponStatusFilter(opts.status, now) : null;

  // $and rather than a merged object: search and status can both contribute an
  // $or, and the second would silently overwrite the first.
  const clauses = [search, status].filter((c): c is Record<string, unknown> => c !== null);
  const filter: Record<string, unknown> = clauses.length > 0 ? { $and: clauses } : {};
  const totalsFilter: Record<string, unknown> = search ?? {};

  /*
    Effective status again, this time as aggregation expressions. `$match` in a
    pipeline is sent to the server verbatim, so these must mirror
    `couponStatusFilter` exactly or the tiles and the table would disagree.
  */
  const isActive = {
    $and: [{ $eq: ["$status", CouponStatus.ACTIVE] }, { $gt: ["$expiresAt", now] }],
  };
  const isRedeemed = { $eq: ["$status", CouponStatus.REDEEMED] };
  const isExpired = {
    $or: [
      { $eq: ["$status", CouponStatus.EXPIRED] },
      { $and: [{ $eq: ["$status", CouponStatus.ACTIVE] }, { $lte: ["$expiresAt", now] }] },
    ],
  };
  const isVoid = { $eq: ["$status", CouponStatus.VOID] };
  // Forfeited = lapsed AND never refunded. An admin-forced expiry returns the
  // points, so those must not be counted as forfeited.
  const isForfeited = { $and: [isExpired, { $eq: ["$refundedAt", null] }] };

  const [docs, total, sums] = await Promise.all([
    Coupon.find(filter)
      .sort({ issuedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Coupon.countDocuments(filter),
    Coupon.aggregate<CouponTotalsAgg>([
      { $match: totalsFilter },
      {
        $group: {
          _id: null,
          activeCount: { $sum: { $cond: [isActive, 1, 0] } },
          activeRupees: { $sum: { $cond: [isActive, "$valueRupees", 0] } },
          activePoints: { $sum: { $cond: [isActive, "$pointsSpent", 0] } },
          redeemedCount: { $sum: { $cond: [isRedeemed, 1, 0] } },
          redeemedRupees: { $sum: { $cond: [isRedeemed, "$valueRupees", 0] } },
          expiredCount: { $sum: { $cond: [isExpired, 1, 0] } },
          expiredRupees: { $sum: { $cond: [isExpired, "$valueRupees", 0] } },
          forfeitedPoints: { $sum: { $cond: [isForfeited, "$pointsSpent", 0] } },
          voidedCount: { $sum: { $cond: [isVoid, 1, 0] } },
          voidedRupees: { $sum: { $cond: [isVoid, "$valueRupees", 0] } },
        },
      },
    ]),
  ]);

  // One query for every member on the page, not one per row: a 20-row page was
  // otherwise 20 round trips, and the CSV export would be thousands.
  const userIds = [...new Map(docs.map((d) => [d.user.toString(), d.user])).values()];
  const users =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select("name email").lean()
      : [];
  const userById = new Map(users.map((u) => [u._id.toString(), u]));

  const agg = sums[0];
  const totals: AdminCouponTotals = agg
    ? {
        activeCount: agg.activeCount,
        activeRupees: agg.activeRupees,
        activePoints: agg.activePoints,
        redeemedCount: agg.redeemedCount,
        redeemedRupees: agg.redeemedRupees,
        expiredCount: agg.expiredCount,
        expiredRupees: agg.expiredRupees,
        forfeitedPoints: agg.forfeitedPoints,
        voidedCount: agg.voidedCount,
        voidedRupees: agg.voidedRupees,
      }
    : ZERO_COUPON_TOTALS;

  return {
    items: docs.map((c) => {
      const lapsed = c.status === CouponStatus.ACTIVE && c.expiresAt.getTime() <= now.getTime();
      const effective = lapsed ? CouponStatus.EXPIRED : c.status;
      const owner = userById.get(c.user.toString());
      return {
        id: id(c),
        code: c.code,
        userId: owner ? owner._id.toString() : "",
        member: owner?.name ?? "Deleted member",
        email: owner?.email ?? "",
        valueRupees: c.valueRupees,
        pointsSpent: c.pointsSpent,
        status: effective,
        source: c.source,
        issuedAt: c.issuedAt.toISOString(),
        expiresAt: c.expiresAt.toISOString(),
        redeemedAt: c.redeemedAt ? c.redeemedAt.toISOString() : null,
        refundedAt: c.refundedAt ? c.refundedAt.toISOString() : null,
        externalRef: c.externalRef ?? null,
        daysRemaining:
          effective === CouponStatus.ACTIVE
            ? Math.max(0, Math.ceil((c.expiresAt.getTime() - now.getTime()) / DAY_MS))
            : 0,
      };
    }),
    totals,
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ---- Referrals ----
export async function adminListReferrals(opts: { status?: string; page?: number }) {
  await dbConnect();
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  const [items, total] = await Promise.all([
    Referral.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE)
      .limit(PAGE)
      .populate<{ referrer: { name: string }; referredUser: { name: string } }>(
        "referrer referredUser",
        "name",
      )
      .lean(),
    Referral.countDocuments(filter),
  ]);
  return {
    items: items.map((r) => ({
      id: r._id.toString(),
      referrer: r.referrer?.name ?? "—",
      referred: r.referredUser?.name ?? "—",
      code: r.referralCode,
      status: r.status,
      rewardPoints: r.rewardPoints,
      createdAt: r.createdAt.toISOString(),
      rewardedAt: r.rewardedAt ? r.rewardedAt.toISOString() : null,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
  };
}

// ---- Contacts ----
export async function adminListContacts(opts: { status?: string; page?: number }) {
  await dbConnect();
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  const [items, total] = await Promise.all([
    ContactSubmission.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE)
      .limit(PAGE)
      .lean(),
    ContactSubmission.countDocuments(filter),
  ]);
  return {
    items: items.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      email: c.email,
      phone: c.phone ?? "",
      subject: c.subject ?? "",
      message: c.message,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
  };
}

// ---- Settings ----
export async function adminGetSettings() {
  await dbConnect();
  const doc = await SystemSettings.findOne({ singleton: "global" }).lean();
  if (!doc) return DEFAULT_SETTINGS;
  return {
    referral: doc.referral,
    quiz: doc.quiz,
    activity: doc.activity,
    integration: doc.integration,
  };
}
