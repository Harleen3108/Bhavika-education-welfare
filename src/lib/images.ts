/**
 * Curated photography for the public site and the seed script.
 *
 * Every id below was fetched from the Unsplash CDN and confirmed to answer
 * HTTP 200, then opened and checked by eye — a 200 only proves the id exists,
 * it does not prove the photo shows an Indian classroom. Both checks matter:
 * a dead id renders as a broken tile on the live gallery, and a wrong subject
 * renders as a stock photo that has nothing to do with our work.
 *
 * Adding an entry means repeating both steps:
 *   curl -s -o /dev/null -w "%{http_code}" "<url>"   # must print 200
 * and then actually looking at the image.
 *
 * Safe to import from client components (no server-only dependencies).
 */
import { PROGRAMS } from "@/lib/site-content";

/**
 * One render size for every entry. The verified URL is the source we hand to
 * next/image, which re-optimises per breakpoint anyway — so a single 1200px
 * source keeps the manifest to exactly the strings that were checked, with no
 * hand-built variants that were never fetched.
 */
const RENDER = "?w=1200&q=80&auto=format&fit=crop";

function unsplash(id: string): string {
  return `https://images.unsplash.com/photo-${id}${RENDER}`;
}

export type ImageCategory =
  | "Education"
  | "Health"
  | "Welfare"
  | "Environment"
  | "Skill Development"
  | "Events";

export interface CuratedImage {
  url: string;
  /** English caption, short enough for a tile overlay. */
  title: string;
  /** Natural Hindi caption — not a transliteration of the English. */
  titleHi: string;
  category: ImageCategory;
  /** Describes what is actually in the frame, for screen readers and SEO. */
  alt: string;
}

export interface PortraitImage {
  url: string;
  alt: string;
}

/* ----------------------------------------------------------------- Gallery */

export const GALLERY_IMAGES: readonly CuratedImage[] = [
  {
    url: unsplash("1692269725836-fbd72e98883f"),
    title: "Morning class in progress",
    titleHi: "सुबह की कक्षा",
    category: "Education",
    alt: "Children in blue school uniforms seated at wooden desks during a morning lesson in a village classroom",
  },
  {
    url: unsplash("1692269725827-699e04a11cdf"),
    title: "One book, two readers",
    titleHi: "एक किताब, दो पाठक",
    category: "Education",
    alt: "Two boys in checked school shirts sharing an open textbook at their classroom desk",
  },
  {
    url: unsplash("1692269725911-87697c558be1"),
    title: "Girls at the front bench",
    titleHi: "अगली कतार की छात्राएँ",
    category: "Education",
    alt: "Two schoolgirls in blue uniforms writing in their notebooks at a shared classroom desk",
  },
  {
    url: unsplash("1522661067900-ab829854a57f"),
    title: "Solving it on the blackboard",
    titleHi: "ब्लैकबोर्ड पर हल",
    category: "Education",
    alt: "A schoolgirl writing with chalk on a large classroom blackboard",
  },
  {
    url: unsplash("1709290749293-c6152a187b14"),
    title: "A teacher and her class",
    titleHi: "शिक्षिका और उनकी कक्षा",
    category: "Education",
    alt: "A teacher in a sari standing beside rows of senior students working at their desks in a bright classroom",
  },
  {
    url: unsplash("1718199885029-6ba9e8b8cf79"),
    title: "The walk to school",
    titleHi: "स्कूल का रास्ता",
    category: "Education",
    alt: "Two children carrying school bags walking along a narrow path through tall grass on their way to school",
  },
  {
    url: unsplash("1559557874-816b40a18d43"),
    title: "Tailoring class",
    titleHi: "सिलाई प्रशिक्षण",
    category: "Skill Development",
    alt: "An older woman guiding cloth through a hand-cranked sewing machine during a tailoring session",
  },
  {
    url: unsplash("1521401415461-83e7162b8e64"),
    title: "A trade that pays",
    titleHi: "हुनर जो कमाई देता है",
    category: "Skill Development",
    alt: "A tailor stitching a red sari on a treadle sewing machine in his roadside workshop",
  },
  {
    url: unsplash("1759738098462-90ffac98c554"),
    title: "Handloom livelihood",
    titleHi: "हथकरघा से आजीविका",
    category: "Skill Development",
    alt: "Village women standing beside a bamboo house where a handloom has been set up for weaving",
  },
  {
    url: unsplash("1708593343442-7595427ddf7b"),
    title: "Self-help group meeting",
    titleHi: "स्वयं सहायता समूह की बैठक",
    category: "Skill Development",
    alt: "Women seated in a circle on the ground under trees while a trainer speaks at a self-help group meeting",
  },
  {
    url: unsplash("1778864874969-16e2432b2709"),
    title: "Free medicines at the camp",
    titleHi: "शिविर में नि:शुल्क दवाइयाँ",
    category: "Health",
    alt: "Health workers standing behind a table laid out with medicine bottles and boxes at a free health camp",
  },
  {
    url: unsplash("1680778469882-a186a77e67d3"),
    title: "Village health camp",
    titleHi: "गाँव का स्वास्थ्य शिविर",
    category: "Health",
    alt: "Villagers seated along the walls of a room waiting their turn at a rural health check-up camp",
  },
  {
    url: unsplash("1680759291357-9e1b771323d5"),
    title: "Check-ups for every family",
    titleHi: "हर परिवार की जाँच",
    category: "Health",
    alt: "A medical volunteer attending to mothers and young children at a rural health camp",
  },
  {
    url: unsplash("1680778470701-b64ce61294ca"),
    title: "Counselling mothers",
    titleHi: "माताओं को परामर्श",
    category: "Health",
    alt: "A health worker in conversation with two women seated on a bench at a village clinic",
  },
  {
    url: unsplash("1709544433784-4f6c0ce2b52a"),
    title: "Nursery of the next forest",
    titleHi: "आने वाले जंगल की नर्सरी",
    category: "Environment",
    alt: "A woman kneeling beside trays of young saplings inside a green shade-net nursery",
  },
  {
    url: unsplash("1708592946248-c7ba5f036436"),
    title: "Planting the first sapling",
    titleHi: "पहला पौधा",
    category: "Environment",
    alt: "Two women planting and watering a young sapling in freshly dug soil in an orchard",
  },
  {
    url: unsplash("1698692014130-d9782b2f955f"),
    title: "A sapling in every hand",
    titleHi: "हर हाथ में एक पौधा",
    category: "Environment",
    alt: "Close-up of hands holding a sapling with its root ball during a tree plantation drive",
  },
  {
    url: unsplash("1707721690626-10e5f0366bcb"),
    title: "Green fields, green future",
    titleHi: "हरे खेत, हरा भविष्य",
    category: "Environment",
    alt: "Women working among rows of leafy green seedlings in a village field",
  },
  {
    url: unsplash("1677128912094-36d988ce198b"),
    title: "Community kitchen",
    titleHi: "सामुदायिक भोजन",
    category: "Welfare",
    alt: "Volunteers serving rice and curry from large vessels to a queue of people at a community meal",
  },
  {
    url: unsplash("1758390286125-bd31d5c8f592"),
    title: "Ration distribution day",
    titleHi: "राशन वितरण का दिन",
    category: "Welfare",
    alt: "A line of women in colourful saris carrying large sacks of supplies along a tree-lined path",
  },
  {
    url: unsplash("1759738101500-6d8d522b2681"),
    title: "Mothers of the village",
    titleHi: "गाँव की माताएँ",
    category: "Welfare",
    alt: "A group of village women standing together with their children outside their homes",
  },
  {
    url: unsplash("1548472730-471d75f20ca1"),
    title: "The children we reach",
    titleHi: "जिन बच्चों तक हम पहुँचते हैं",
    category: "Welfare",
    alt: "Children gathered around a hand cart on open ground at the edge of a settlement",
  },
  {
    url: unsplash("1524069290683-0457abfe42c3"),
    title: "Annual day cheer",
    titleHi: "वार्षिक दिवस का उत्साह",
    category: "Events",
    alt: "A crowd of schoolchildren in blue uniforms laughing and waving at the camera",
  },
  {
    url: unsplash("1629872928185-171e13c8e58b"),
    title: "Rally for the right to learn",
    titleHi: "पढ़ने के अधिकार की रैली",
    category: "Events",
    alt: "Schoolchildren in uniform cheering together during a street awareness rally",
  },
  {
    url: unsplash("1569173675610-42c361a86e37"),
    title: "Our students, our pride",
    titleHi: "हमारे छात्र, हमारा गर्व",
    category: "Events",
    alt: "A group of schoolboys in blue uniforms standing together under a tree in the school yard",
  },
  {
    url: unsplash("1708593330411-24d85eff0728"),
    title: "Doorstep outreach",
    titleHi: "घर-घर जनसंपर्क",
    category: "Events",
    alt: "A field worker carrying a backpack talking with a group of village women outside a home",
  },
];

/* -------------------------------------------------------------------- Hero */

/** Wide, hopeful frames for page heroes and the homepage banner. */
export const HERO_IMAGES: readonly CuratedImage[] = [
  {
    url: unsplash("1692269726060-9c604e06f63b"),
    title: "Learning that lasts",
    titleHi: "ऐसी पढ़ाई जो साथ रहे",
    category: "Education",
    alt: "A boy and a girl in school uniform writing side by side in their notebooks at a classroom desk",
  },
  {
    url: unsplash("1572847748080-bac263fae977"),
    title: "Every girl in school",
    titleHi: "हर बेटी स्कूल में",
    category: "Education",
    alt: "A schoolgirl in uniform standing at the front of her classroom with her classmates behind her",
  },
  {
    url: unsplash("1542810634-71277d95dcbb"),
    title: "The whole village learns",
    titleHi: "पूरा गाँव सीखता है",
    category: "Education",
    alt: "Children seated close together on the floor of a village hall during a community learning session",
  },
];

/* ---------------------------------------------------------------- Programs */

type ProgramKey = (typeof PROGRAMS)[number]["key"];

/** Keyed to PROGRAMS in site-content so a new programme fails to compile without art. */
export const PROGRAM_IMAGES: Record<ProgramKey, CuratedImage> = {
  education: {
    url: unsplash("1757877151735-e48f41c26393"),
    title: "Education Support",
    titleHi: "शिक्षा सहायता",
    category: "Education",
    alt: "A girl leaning over her notebook, writing carefully with a pencil",
  },
  women: {
    url: unsplash("1641749572766-08a4c9dadebd"),
    title: "Women Empowerment",
    titleHi: "महिला सशक्तिकरण",
    category: "Welfare",
    alt: "Four women in bright traditional skirts walking together along a village road",
  },
  skills: {
    url: unsplash("1759738094065-c40129ba62ac"),
    title: "Skill Development",
    titleHi: "कौशल विकास",
    category: "Skill Development",
    alt: "Young learners working together at a traditional wooden weaving loom",
  },
  career: {
    url: unsplash("1544456203-0af5a69f5789"),
    title: "Career Guidance",
    titleHi: "करियर मार्गदर्शन",
    category: "Education",
    alt: "A student reading a book alone at a long wooden table in a library",
  },
  health: {
    url: unsplash("1666886573583-9839aafe43cf"),
    title: "Health Camps",
    titleHi: "स्वास्थ्य शिविर",
    category: "Health",
    alt: "A doctor in a white coat with a stethoscope around the neck at a clinic",
  },
  environment: {
    url: unsplash("1708592953226-11ad725adc75"),
    title: "Environment Awareness",
    titleHi: "पर्यावरण जागरूकता",
    category: "Environment",
    alt: "Women planting saplings and clearing soil in a village orchard",
  },
};

/* ------------------------------------------------------------- Testimonials */

/**
 * Portraits for quoted voices. Keyed by who the person is rather than by name,
 * so the seed can swap a quote without the face silently following it.
 */
export const TESTIMONIAL_AVATARS = {
  parent: {
    url: unsplash("1774437790863-88a80bca5b29"),
    alt: "An older woman in an orange and cream sari smiling on a busy street",
  },
  trainee: {
    url: unsplash("1774437890454-634d48db52c8"),
    alt: "A woman in a red sari smiling warmly at a community gathering",
  },
  graduate: {
    url: unsplash("1759840278361-f1adc75529a1"),
    alt: "A young woman in a red kurta smiling at an evening event",
  },
  elder: {
    url: unsplash("1632414237690-7713a79fe9d3"),
    alt: "An elderly farmer in a white turban holding a walking stick",
  },
  father: {
    url: unsplash("1609252509102-aa73ff792667"),
    alt: "A middle-aged man in a white shirt sitting under a tree beside a field",
  },
  volunteer: {
    url: unsplash("1724996854069-a7d335193ee2"),
    alt: "A man in a white shirt with a towel over his shoulder standing outdoors",
  },
  student: {
    url: unsplash("1603185030522-05d4497bb180"),
    alt: "A smiling boy in a checked shirt standing in a village lane",
  },
  schoolgirl: {
    url: unsplash("1774437894079-e560a59632f2"),
    alt: "A girl in a traditional orange sari holding a book at a community event",
  },
} as const satisfies Record<string, PortraitImage>;
