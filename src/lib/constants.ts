/** Static, non-secret app constants. Safe to import anywhere (client or server). */

export const SITE = {
  name: "Bhavika Education & Welfare Foundation",
  shortName: "Bhavika Foundation",
  tagline: "Empowerment Through Knowledge & Care",
  description:
    "Bhavika Education & Welfare Foundation empowers communities through education, welfare programs, and engagement. Join us, learn through quizzes, and grow together.",
  // Fallback; overridden at runtime by NEXT_PUBLIC_SITE_URL when set.
  url: "https://bhavikafoundation.org",
  locale: "en_IN",
  timezone: "Asia/Kolkata",
  contact: {
    email: "avanienterprises.contact@gmail.com",
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    address: "India",
  },
  social: {
    facebook: "",
    instagram: "",
    youtube: "",
    twitter: "",
  },
} as const;

/** Primary public navigation. */
export const PUBLIC_NAV = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Mission & Vision", href: "/mission-vision" },
  { label: "Gallery", href: "/gallery" },
  { label: "Videos", href: "/videos" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Partners", href: "/partners" },
  { label: "Contact", href: "/contact" },
] as const;

export const USER_NAV = [
  { label: "Overview", href: "/dashboard" },
  { label: "Quizzes", href: "/dashboard/quizzes" },
  { label: "Wallet", href: "/dashboard/wallet" },
  { label: "Referrals", href: "/dashboard/referrals" },
  { label: "Leaderboard", href: "/dashboard/leaderboard" },
  { label: "Benefits", href: "/dashboard/benefits" },
  { label: "Profile", href: "/dashboard/profile" },
] as const;

export const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Content", href: "/admin/content" },
  { label: "Gallery", href: "/admin/gallery" },
  { label: "Videos", href: "/admin/videos" },
  { label: "Testimonials", href: "/admin/testimonials" },
  { label: "Partners", href: "/admin/partners" },
  { label: "Quizzes", href: "/admin/quizzes" },
  { label: "Users", href: "/admin/users" },
  { label: "Wallet", href: "/admin/wallet" },
  { label: "Referrals", href: "/admin/referrals" },
  { label: "Contacts", href: "/admin/contacts" },
  { label: "Settings", href: "/admin/settings" },
] as const;

/** Default business rules — persisted (and overridable) via SystemSettings collection. */
export const DEFAULT_SETTINGS = {
  referral: {
    /** Points awarded to the referrer when a referral qualifies. */
    referrerReward: 50,
    /** Points awarded to the referred user on qualification. */
    referredReward: 0,
    /** Rule: what makes a referral QUALIFIED. */
    requireEmailVerification: true,
    requireFirstQuiz: true,
  },
  quiz: {
    /** Default seconds per quiz if a quiz does not set its own limit. */
    defaultTimeLimitSeconds: 300,
    /** Default max attempts per quiz period. */
    defaultMaxAttempts: 1,
    /** Default points per correct answer. */
    defaultPointsPerCorrect: 10,
  },
  activity: {
    profileCompletionPoints: 20,
  },
  integration: {
    /** Phase 2 redemption disabled until Jai Maa Durga is live. */
    redemptionEnabled: false,
  },
} as const;

export const RATE_LIMITS = {
  contact: { limit: 3, windowSeconds: 600 }, // 3 submissions / 10 min / IP
  login: { limit: 8, windowSeconds: 300 },
  register: { limit: 5, windowSeconds: 600 },
  forgotPassword: { limit: 4, windowSeconds: 900 },
  quizStart: { limit: 20, windowSeconds: 300 },
  quizSubmit: { limit: 30, windowSeconds: 300 },
} as const;

export const UPLOAD = {
  maxImageBytes: 5 * 1024 * 1024, // 5 MB
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
} as const;

export const REFERRAL_CODE_LENGTH = 8;
