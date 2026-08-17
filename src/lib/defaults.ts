/**
 * Default editorial content used as a fallback when the CMS (Content
 * collection) has no override yet, or when the database is unreachable during
 * static generation. Admins overwrite these via /admin/content.
 */

import { FAQS, FOUNDER, IMPACT, PILLARS, PROGRAMS } from "@/lib/site-content";

export type AboutContent = {
  heading: string;
  intro: string;
  story: string[];
  objectives: string[];
  areas: { title: string; body: string }[];
};

export type MissionVisionContent = {
  mission: string;
  vision: string;
  values: { title: string; body: string }[];
};

export type ContactInfo = {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapEmbedUrl: string;
  hours: string;
};

export const DEFAULT_ABOUT: AboutContent = {
  heading: "About Bhavika Education & Welfare Foundation",
  intro:
    "Bhavika Education & Welfare Foundation is a community-driven non-profit committed to empowering underserved families through education, welfare and opportunity.",
  story: [
    "Bhavika Foundation began with a simple belief: that knowledge and care, offered together, can transform lives. What started as a handful of volunteers running weekend learning sessions has grown into a foundation serving thousands across multiple communities.",
    "Today we run learning centres, scholarship programs, health and welfare drives, and skill-building initiatives — always in partnership with the communities we serve. We measure success not in numbers alone, but in dignity restored and futures opened.",
  ],
  objectives: [
    "Provide quality education and learning resources to underserved children and youth.",
    "Support families in need through welfare, health and relief programs.",
    "Build local capacity through skills training and volunteering.",
    "Foster a culture of giving, learning and community participation.",
  ],
  areas: [
    {
      title: "Education & Scholarships",
      body: "Learning centres, digital literacy and scholarships that keep children in school.",
    },
    {
      title: "Health & Welfare",
      body: "Health camps, nutrition support and relief for families during hardship.",
    },
    {
      title: "Skills & Livelihood",
      body: "Vocational training and mentorship that create pathways to dignified work.",
    },
    {
      title: "Community Engagement",
      body: "Volunteering, awareness campaigns and partnerships that strengthen communities.",
    },
  ],
};

export const DEFAULT_MISSION_VISION: MissionVisionContent = {
  mission:
    "To empower individuals and communities through accessible education, compassionate welfare and meaningful opportunity — so that every person can live with dignity and hope.",
  vision:
    "A society where knowledge and care reach everyone, and where no one is left behind because of where they were born or what they lack.",
  values: [
    { title: "Compassion", body: "We lead with empathy and treat every person with dignity." },
    { title: "Integrity", body: "We are transparent, accountable and honest in all we do." },
    { title: "Empowerment", body: "We enable people to help themselves and their communities." },
    { title: "Inclusion", body: "We serve all, without discrimination of any kind." },
    { title: "Excellence", body: "We hold ourselves to the highest standards of impact." },
    { title: "Collaboration", body: "We achieve more by working with communities and partners." },
  ],
};

export const DEFAULT_CONTACT: ContactInfo = {
  email: "avanienterprises.contact@gmail.com",
  phone: "+91 00000 00000",
  whatsapp: "910000000000",
  address: "India",
  // A generic India map embed; admin replaces with the real location.
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3502398.0!2d78.9629!3d20.5937!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sin!4v1700000000000",
  hours: "Mon – Sat, 10:00 AM – 6:00 PM IST",
};

/* ------------------------------------------------------ Homepage sections */

/**
 * The homepage sections below are stored as Content blocks and fall back to the
 * marketing copy in `site-content` until an admin saves an override — a fresh
 * deployment renders a complete page with an empty database.
 */

/** A live counter that can stand in for an editorial impact figure. */
export type ImpactSource =
  | "users"
  | "quizzes"
  | "quizAttempts"
  | "gallery"
  | "partners"
  | "testimonials";

export type ImpactStat = {
  key: string;
  /** Editorial figure, shown until the live counter reports something. */
  value: string;
  label: string;
  labelHi: string;
  /** Live counter that replaces `value` once it is non-zero. */
  source: ImpactSource | null;
};

export type HomeImpactContent = { stats: ImpactStat[] };

export type ProgramItem = {
  key: string;
  icon: string;
  title: string;
  titleHi: string;
  body: string;
  stat: string;
  statHi: string;
};

export type HomeProgramsContent = { items: ProgramItem[] };

export type PillarItem = { icon: string; title: string; titleHi: string; body: string };

export type HomePillarsContent = { items: PillarItem[] };

export type FaqItem = { q: string; qHi: string; a: string; aHi?: string };

export type HomeFaqContent = { items: FaqItem[] };

export type FounderContent = {
  quote: string;
  quoteHi: string;
  role: string;
  roleHi: string;
  name?: string;
  imageUrl?: string;
};

/**
 * Which live counter backs each impact figure, keyed by its English label.
 * Only mappings where the counter genuinely measures what the label claims are
 * listed; everything else stays editorial. An admin can repoint any stat by
 * editing the stored block.
 */
const IMPACT_SOURCES: Record<string, ImpactSource> = {
  "Students reached": "users",
  // "Schools partnered" is deliberately NOT backed by the `partners` counter:
  // the Partner collection holds every kind of collaborator — a retail store, a
  // health centre, a nursery, a self-help group — so publishing its size as a
  // count of schools states something the data does not say.
};

export const DEFAULT_HOME_IMPACT: HomeImpactContent = {
  stats: IMPACT.map((s) => ({
    key: s.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    value: s.value,
    label: s.label,
    labelHi: s.labelHi,
    source: IMPACT_SOURCES[s.label] ?? null,
  })),
};

export const DEFAULT_HOME_PROGRAMS: HomeProgramsContent = {
  items: PROGRAMS.map((p) => ({ ...p })),
};

export const DEFAULT_HOME_PILLARS: HomePillarsContent = {
  items: PILLARS.map((p) => ({ ...p })),
};

export const DEFAULT_HOME_FAQ: HomeFaqContent = {
  items: FAQS.map((f) => ({ ...f })),
};

export const DEFAULT_HOME_FOUNDER: FounderContent = { ...FOUNDER };

/** Content keys used in the Content collection. */
export const CONTENT_KEYS = {
  about: "about",
  missionVision: "mission-vision",
  contactInfo: "contact-info",
  homeHero: "home-hero",
  homeImpact: "home-impact",
  homePrograms: "home-programs",
  homePillars: "home-pillars",
  homeFaq: "home-faq",
  homeFounder: "home-founder",
} as const;
