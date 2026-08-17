import "server-only";
import type { Types } from "mongoose";
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
} from "@/server/models";
import { DEFAULT_SETTINGS, SITE } from "@/lib/constants";
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
    filter.user = opts.userId;
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
