import "server-only";
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
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { DEFAULT_ABOUT, DEFAULT_MISSION_VISION, DEFAULT_CONTACT, CONTENT_KEYS } from "@/lib/defaults";

const PAGE = 20;

function id<T extends { _id: { toString(): string } }>(d: T) {
  return d._id.toString();
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
export async function adminListUsers(opts: { q?: string; status?: string; page?: number }) {
  await dbConnect();
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.q) {
    filter.$or = [
      { name: { $regex: opts.q, $options: "i" } },
      { email: { $regex: opts.q, $options: "i" } },
      { referralCode: opts.q.toUpperCase() },
    ];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    User.countDocuments(filter),
  ]);
  return {
    items: users.map((u) => ({
      id: id(u),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      emailVerified: Boolean(u.emailVerified),
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
  };
}

export async function adminGetUserDetail(userId: string) {
  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) return null;
  const [wallet, attempts, referralsMade, txns] = await Promise.all([
    Wallet.findOne({ user: userId }).lean(),
    QuizAttempt.find({ user: userId, status: { $ne: "IN_PROGRESS" } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate<{ quiz: { title: string } }>("quiz", "title")
      .lean(),
    Referral.find({ referrer: userId })
      .populate<{ referredUser: { name: string } }>("referredUser", "name")
      .lean(),
    WalletTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return {
    id: id(user),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerified),
    phone: user.phone ?? "",
    city: user.city ?? "",
    referralCode: user.referralCode,
    createdAt: user.createdAt.toISOString(),
    wallet: {
      total: wallet?.totalBalance ?? 0,
      quiz: wallet?.quizBalance ?? 0,
      referral: wallet?.referralBalance ?? 0,
      activity: wallet?.activityBalance ?? 0,
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
      name: r.referredUser?.name ?? "Member",
      status: r.status,
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
export async function adminListTransactions(opts: { q?: string; source?: string; page?: number }) {
  await dbConnect();
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (opts.source) filter.source = opts.source;
  const [items, total] = await Promise.all([
    WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE)
      .limit(PAGE)
      .populate<{ user: { name: string; email: string } }>("user", "name email")
      .lean(),
    WalletTransaction.countDocuments(filter),
  ]);
  return {
    items: items.map((t) => ({
      id: t._id.toString(),
      user: t.user?.name ?? "—",
      email: t.user?.email ?? "",
      source: t.source,
      type: t.type,
      points: t.points,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    total,
    page,
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
