/** Static, non-secret app constants. Safe to import anywhere (client or server). */

export const SITE = {
  name: "Bhavika Education & Welfare Foundation",
  shortName: "Bhavika Foundation",
  nameHi: "भाविका एजुकेशन एंड वेलफेयर फाउंडेशन",
  tagline: "Learn • Compete • Earn",
  taglineHi: "सीखो • जीतो • कमाओ",
  description:
    "Bhavika Education & Welfare Foundation turns everyday learning into daily quizzes, points and real rewards for children in small towns and villages. Play, climb the leaderboard, and earn discounts your family can actually use.",
  /**
   * The canonical public address of the site.
   *
   * Distinct from `env.SITE_URL`, which is whatever host the app is currently
   * running on (localhost in development). Anything a user is expected to
   * SHARE — a referral link above all — must use this, never the running host,
   * or a developer's machine hands out `http://localhost:3000/register?ref=…`.
   */
  url: "https://bhavika-education-welfare.vercel.app",
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

/**
 * Primary public navigation. Ordered so the engagement platform (Quiz,
 * Rewards, Leaderboard) sits mid-bar rather than buried — it is the reason
 * most visitors register. Secondary pages (Mission & Vision, Videos,
 * Testimonials, Partners) are reachable from the footer and the About page.
 */
export const PUBLIC_NAV = [
  { label: "Home", hi: "होम", href: "/" },
  { label: "About", hi: "हमारे बारे में", href: "/about" },
  { label: "Programs", hi: "कार्यक्रम", href: "/programs" },
  { label: "Quiz", hi: "क्विज़", href: "/quiz" },
  { label: "Rewards", hi: "इनाम", href: "/rewards" },
  { label: "Leaderboard", hi: "लीडरबोर्ड", href: "/leaderboard" },
  { label: "Gallery", hi: "गैलरी", href: "/gallery" },
  { label: "Contact", hi: "संपर्क", href: "/contact" },
] as const;

/** Secondary pages — footer only. */
export const FOOTER_NAV = [
  { label: "Mission & Vision", hi: "लक्ष्य और दृष्टि", href: "/mission-vision" },
  { label: "Videos", hi: "वीडियो", href: "/videos" },
  { label: "Testimonials", hi: "लोगों की राय", href: "/testimonials" },
  { label: "Partners", hi: "सहयोगी", href: "/partners" },
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
