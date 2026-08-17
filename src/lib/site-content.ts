/**
 * Bilingual marketing copy for the public site.
 *
 * Kept out of the page components so the content can be reviewed and edited
 * without touching layout, and so the same blocks can be reused across the
 * homepage and the dedicated Programs / Quiz / Rewards pages.
 *
 * Every entry pairs English with Hindi — both are rendered together.
 * Safe to import from client components (no server-only dependencies).
 */

/* ---------------------------------------------------------------- Programs */

export const PROGRAMS = [
  {
    key: "education",
    icon: "BookOpen",
    title: "Education Support",
    titleHi: "शिक्षा सहायता",
    body: "Free learning material, after-school coaching and the digital quiz platform for Classes 1–12.",
    stat: "4,200+ students enrolled",
    statHi: "छात्र नामांकित",
  },
  {
    key: "women",
    icon: "HeartHandshake",
    title: "Women Empowerment",
    titleHi: "महिला सशक्तिकरण",
    body: "Tailoring, computer literacy and micro-enterprise training so women earn on their own terms.",
    stat: "860+ women trained",
    statHi: "महिलाएँ प्रशिक्षित",
  },
  {
    key: "skills",
    icon: "Wrench",
    title: "Skill Development",
    titleHi: "कौशल विकास",
    body: "Job-ready short courses in computers, electrical work, spoken English and financial basics.",
    stat: "31 batches completed",
    statHi: "बैच पूरे हुए",
  },
  {
    key: "career",
    icon: "Compass",
    title: "Career Guidance",
    titleHi: "करियर मार्गदर्शन",
    body: "Counselling, scholarship help and competitive-exam mentoring for first-generation learners.",
    stat: "1,100+ students counselled",
    statHi: "छात्रों को परामर्श",
  },
  {
    key: "health",
    icon: "Stethoscope",
    title: "Health Camps",
    titleHi: "स्वास्थ्य शिविर",
    body: "Free check-ups, eye and dental screening, hygiene awareness and seasonal blood donation drives.",
    stat: "48 camps held",
    statHi: "शिविर आयोजित",
  },
  {
    key: "environment",
    icon: "Leaf",
    title: "Environment Awareness",
    titleHi: "पर्यावरण जागरूकता",
    body: "Tree plantation with school eco-clubs, plastic-free drives and water conservation education.",
    stat: "12,000+ saplings planted",
    statHi: "पौधे लगाए गए",
  },
] as const;

/* ------------------------------------------------- Problem → Solution pairs */

export const GAP = [
  {
    problem: "Learning feels like a chore",
    problemHi: "पढ़ाई बोझ बन जाती है",
    problemBody:
      "Rote syllabus with no feedback loop. Children lose interest long before they lose ability.",
    solution: "Make it a game, daily",
    solutionHi: "रोज़ का खेल बनाओ",
    solutionBody:
      "Short timed quizzes with instant scores. Ten minutes a day, and a reason to come back tomorrow.",
  },
  {
    problem: "Effort goes unrecognised",
    problemHi: "मेहनत अनदेखी रह जाती है",
    problemBody:
      "A child who improves quietly is never celebrated. Only rank-holders get noticed.",
    solution: "Celebrate every climb",
    solutionHi: "हर प्रगति का जश्न",
    solutionBody:
      "Leaderboards, streaks and certificates — recognition for improvement, not just for being first.",
  },
  {
    problem: "Families see no return",
    problemHi: "परिवार को लाभ नहीं दिखता",
    problemBody:
      "Parents weigh school hours against work hours. Education competes with income and usually loses.",
    solution: "Turn points into savings",
    solutionHi: "पॉइंट्स से बचत",
    solutionBody:
      "Points convert into coupons that cut the household grocery bill. Studying starts paying for itself.",
  },
] as const;

/* --------------------------------------------------- The six-step journey */

export const JOURNEY = [
  {
    step: 1,
    icon: "UserPlus",
    title: "Student joins",
    titleHi: "छात्र जुड़ता है",
    body: "Free sign-up. No fee at any stage.",
  },
  {
    step: 2,
    icon: "Timer",
    title: "Daily quiz",
    titleHi: "रोज़ की क्विज़",
    body: "Timed questions, auto-submit, instant score.",
  },
  {
    step: 3,
    icon: "Coins",
    title: "Earn points",
    titleHi: "पॉइंट्स कमाओ",
    body: "Correct answers credit the point wallet.",
  },
  {
    step: 4,
    icon: "Trophy",
    title: "Leaderboard",
    titleHi: "लीडरबोर्ड",
    body: "Daily, weekly and monthly rankings.",
  },
  {
    step: 5,
    icon: "Ticket",
    title: "Reward coupon",
    titleHi: "इनाम कूपन",
    body: "Points convert into a redeemable coupon.",
  },
  {
    step: 6,
    icon: "Store",
    title: "Jai Maa Durga store",
    titleHi: "जय माँ दुर्गा",
    body: "Coupon applies as a real discount.",
  },
] as const;

/* ------------------------------------------------------ The wallet system */

export const WALLETS = [
  {
    key: "quiz",
    icon: "Trophy",
    title: "Quiz Wallet",
    titleHi: "क्विज़ वॉलेट",
    value: "1,240",
    body: "Points earned from daily, weekly and monthly quizzes.",
  },
  {
    key: "referral",
    icon: "Users",
    title: "Referral Wallet",
    titleHi: "रेफ़रल वॉलेट",
    value: "460",
    body: "Points earned when an invited friend joins and plays.",
  },
  {
    key: "activity",
    icon: "Sparkles",
    title: "Activity Wallet",
    titleHi: "एक्टिविटी वॉलेट",
    value: "310",
    body: "Points for streaks, events, camps and volunteering.",
  },
  {
    key: "reward",
    icon: "Gift",
    title: "Reward Wallet",
    titleHi: "रिवॉर्ड वॉलेट",
    value: "₹ 890",
    body: "Converted coupon value, ready to spend at the store.",
  },
] as const;

/* --------------------------------------- Where value is earned vs. spent */

export const EARNED_HERE = [
  { en: "Daily, weekly & monthly quizzes", hi: "रोज़, साप्ताहिक और मासिक क्विज़" },
  { en: "Points, streaks and leaderboards", hi: "पॉइंट्स, स्ट्रीक और रैंकिंग" },
  { en: "Referral and activity rewards", hi: "रेफ़रल और एक्टिविटी इनाम" },
  { en: "Certificates and recognition", hi: "प्रमाणपत्र और सम्मान" },
] as const;

export const SPENT_THERE = [
  { en: "Groceries, fashion & electronics", hi: "किराना, फ़ैशन और इलेक्ट्रॉनिक्स" },
  { en: "Gold & silver jewellery", hi: "सोने-चाँदी के आभूषण" },
  { en: "Mobile, DTH & utility recharge", hi: "मोबाइल, डीटीएच और रिचार्ज" },
  { en: "Coupons applied at checkout", hi: "चेकआउट पर कूपन लागू" },
] as const;

/** The full earn → redeem chain, rendered as a horizontal flow strip. */
export const REWARD_CHAIN = [
  { en: "Quiz", hi: "क्विज़", icon: "Sparkles" },
  { en: "Earn points", hi: "पॉइंट्स", icon: "Coins" },
  { en: "Reward coupon", hi: "कूपन", icon: "Ticket" },
  { en: "Secure redirect", hi: "रीडायरेक्ट", icon: "ShieldCheck" },
  { en: "Jai Maa Durga", hi: "जय माँ दुर्गा", icon: "Store" },
  { en: "Discount applied", hi: "छूट मिली", icon: "BadgePercent" },
] as const;

/* -------------------------------------------------------------- Impact */

export const IMPACT = [
  { value: "10,000+", label: "Students reached", labelHi: "छात्र" },
  { value: "500+", label: "Schools partnered", labelHi: "विद्यालय" },
  { value: "50+", label: "Programs run", labelHi: "कार्यक्रम" },
  { value: "25+", label: "Communities served", labelHi: "समुदाय" },
] as const;

/* ----------------------------------------------------------------- FAQ */

export const FAQS = [
  {
    q: "Is the quiz platform really free for students?",
    qHi: "क्या यह पूरी तरह नि:शुल्क है?",
    a: "Yes — completely free, at every stage. There is no registration fee, no subscription and no charge to play any quiz or claim a reward. The Foundation is funded by donations and partner contributions, never by the children who use it.",
  },
  {
    q: "How do quiz points become a discount?",
    qHi: "पॉइंट्स छूट में कैसे बदलते हैं?",
    a: "Points accumulate in your wallet from quizzes, referrals and activities. Once you cross the conversion threshold, you can convert them into a reward coupon. That coupon is then applied as a real discount at the Jai Maa Durga store — your points are never simply deleted, every transfer is recorded and auditable.",
  },
  {
    q: "Which classes and subjects are covered?",
    qHi: "कौन-सी कक्षाएँ शामिल हैं?",
    a: "Classes 1 to 12, across general knowledge, science, mathematics, English and current affairs. Questions are set in both English and Hindi so language is never the barrier.",
  },
  {
    q: "Do I need a fast internet connection or an expensive phone?",
    qHi: "तेज़ इंटरनेट ज़रूरी है?",
    a: "No. The platform is built to run on an entry-level Android phone over a 3G connection. Pages are light, images are compressed, and a quiz works fine on a shared family device.",
  },
  {
    q: "How is the Foundation funded, and is it transparent?",
    qHi: "संस्था का संचालन कैसे होता है?",
    a: "Through individual donations, CSR partnerships and local sponsors. Every point credited and every coupon redeemed is written to an immutable transaction ledger, so a parent can always trace exactly where a point came from and where it went.",
  },
  {
    q: "Can I volunteer or partner with Bhavika Foundation?",
    qHi: "क्या मैं जुड़ सकता हूँ?",
    a: "Yes, and we need it. Teach a class, help run a health camp, sponsor a scholarship, or bring your organisation on board as a partner. Two hours a month genuinely changes a child's year — reach us through the contact form or on WhatsApp.",
  },
] as const;

/* -------------------------------------------------- Founder's message */

export const FOUNDER = {
  quote:
    "When I began, I met a girl who walked six kilometres to school and still stood first in her class. She did not need charity — she needed someone to notice. Bhavika exists so that no child's effort goes unnoticed again. Every quiz answered, every point earned, every reward redeemed is our way of saying: we saw you, and we are proud of you.",
  quoteHi: "हर बच्चे की मेहनत का सम्मान होना चाहिए — यही भाविका का उद्देश्य है।",
  role: "Founder & Chairperson",
  roleHi: "संस्थापक एवं अध्यक्ष",
} as const;

/* ---------------------------------------------------- Mission / Vision */

export const PILLARS = [
  {
    icon: "Target",
    title: "Our Mission",
    titleHi: "हमारा लक्ष्य",
    body: "To make quality learning engaging, measurable and rewarding for every child — regardless of which town they were born in or what their family can afford.",
  },
  {
    icon: "Eye",
    title: "Our Vision",
    titleHi: "हमारी दृष्टि",
    body: "An India where a child's curiosity is never limited by their pin code, and where every hour spent learning returns something real to their family.",
  },
  {
    icon: "HeartHandshake",
    title: "Our Values",
    titleHi: "हमारे मूल्य",
    body: "Dignity over charity. Transparency in every rupee. Consistency over one-day events. And treating every child as capable, because they are.",
  },
] as const;

/* ------------------------------------- Sample leaderboard (marketing preview) */

/**
 * Illustrative rows for the logged-out leaderboard preview on the homepage.
 * The signed-in board at /dashboard/leaderboard reads real data from
 * `leaderboard.service`; this is a static teaser only.
 */
export const LEADERBOARD_PREVIEW = [
  { rank: 1, name: "Rahul Verma", meta: "Class 9", points: 980, delta: "+38" },
  { rank: 2, name: "Anjali Sharma", meta: "Class 8", points: 920, delta: "+21" },
  { rank: 3, name: "Aman Gupta", meta: "Class 10", points: 900, delta: "+17" },
  { rank: 4, name: "Priya Yadav", meta: "Class 7", points: 865, delta: "+12" },
  { rank: 5, name: "Sahil Khan", meta: "Class 9", points: 830, delta: "+9" },
] as const;

/** Sample question used in the hero card to show the product, not describe it. */
export const SAMPLE_QUESTION = {
  category: "Science",
  categoryHi: "विज्ञान",
  q: "Which planet is known as the Red Planet?",
  qHi: "किस ग्रह को लाल ग्रह कहा जाता है?",
  options: [
    { en: "Venus", hi: "शुक्र" },
    { en: "Mars", hi: "मंगल" },
    { en: "Jupiter", hi: "बृहस्पति" },
  ],
  correctIndex: 1,
} as const;
