/**
 * Default editorial content used as a fallback when the CMS (Content
 * collection) has no override yet, or when the database is unreachable during
 * static generation. Admins overwrite these via /admin/content.
 */

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

/** Content keys used in the Content collection. */
export const CONTENT_KEYS = {
  about: "about",
  missionVision: "mission-vision",
  contactInfo: "contact-info",
  homeHero: "home-hero",
} as const;
