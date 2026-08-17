import "server-only";
import { dbConnect } from "@/server/db/connect";
import {
  Content,
  GalleryItem,
  Partner,
  Quiz,
  QuizAttempt,
  Testimonial,
  User,
} from "@/server/models";
import { AccountStatus, AttemptStatus, QuizStatus, UserRole } from "@/lib/enums";
import {
  CONTENT_KEYS,
  DEFAULT_HOME_FAQ,
  DEFAULT_HOME_FOUNDER,
  DEFAULT_HOME_IMPACT,
  DEFAULT_HOME_PILLARS,
  DEFAULT_HOME_PROGRAMS,
  type FaqItem,
  type FounderContent,
  type HomeFaqContent,
  type HomeImpactContent,
  type HomePillarsContent,
  type HomeProgramsContent,
  type PillarItem,
  type ProgramItem,
} from "@/lib/defaults";

/**
 * Homepage data, assembled from the database with the compiled marketing copy
 * as the fallback. Nothing here throws: an unreachable Mongo, a missing block
 * or an empty collection all degrade to the static content so the page always
 * renders.
 */

/** A homepage section plus whether its content actually came from the database. */
export type LiveSection<T> = { data: T; isLive: boolean };

/** An impact figure after the live counter has been applied (or not). */
export type HomeImpactStat = {
  key: string;
  value: string;
  label: string;
  labelHi: string;
  /** True when `value` is a real count rather than the editorial figure. */
  isLive: boolean;
};

/** Raw platform counts, straight from the collections. */
export type HomeCounts = {
  /** Active, non-admin accounts — the registered student base. */
  users: number;
  /** Published quizzes. */
  quizzes: number;
  /** Quiz attempts submitted so far. */
  quizAttempts: number;
  gallery: number;
  partners: number;
  testimonials: number;
};

export type HomePageData = {
  impact: LiveSection<HomeImpactStat[]>;
  programs: LiveSection<ProgramItem[]>;
  pillars: LiveSection<PillarItem[]>;
  faqs: LiveSection<FaqItem[]>;
  founder: LiveSection<FounderContent>;
  counts: LiveSection<HomeCounts>;
};

const EMPTY_COUNTS: HomeCounts = {
  users: 0,
  quizzes: 0,
  quizAttempts: 0,
  gallery: 0,
  partners: 0,
  testimonials: 0,
};

const numberFormat = new Intl.NumberFormat("en-IN");

/**
 * Run a read against Mongo, returning `fallback` if the DB is unreachable
 * (e.g. during static generation without a live connection).
 */
async function safeRead<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    await dbConnect();
    return await fn();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[site-data.service] DB read failed, using fallback:", (err as Error).message);
    }
    return fallback;
  }
}

/**
 * Merge a stored Content block over its default, reporting whether an override
 * was actually found — the UI badges live sections differently from seeded copy.
 */
async function getBlock<T extends Record<string, unknown>>(
  key: string,
  fallback: T,
): Promise<LiveSection<T>> {
  return safeRead<LiveSection<T>>(
    async () => {
      const doc = await Content.findOne({ key }).lean();
      const stored = doc?.data as Partial<T> | undefined;
      if (!stored || Object.keys(stored).length === 0) {
        return { data: fallback, isLive: false };
      }
      return { data: { ...fallback, ...stored }, isLive: true };
    },
    { data: fallback, isLive: false },
  );
}

/**
 * Unwrap a stored list block. A block saved with an empty (or malformed) list
 * reverts to the default — a blank homepage section is worse than seeded copy.
 */
function toList<T>(section: LiveSection<{ items: T[] }>, fallback: T[]): LiveSection<T[]> {
  const items = section.data.items;
  if (!Array.isArray(items) || items.length === 0) return { data: fallback, isLive: false };
  return { data: items, isLive: section.isLive };
}

async function getCounts(): Promise<LiveSection<HomeCounts>> {
  return safeRead<LiveSection<HomeCounts>>(
    async () => {
      const [users, quizzes, quizAttempts, gallery, partners, testimonials] =
        await Promise.all([
          // Admins are excluded: this number is published as "students reached".
          User.countDocuments({ role: UserRole.USER, status: AccountStatus.ACTIVE }),
          Quiz.countDocuments({ status: QuizStatus.ACTIVE }),
          QuizAttempt.countDocuments({ status: AttemptStatus.SUBMITTED }),
          GalleryItem.countDocuments({ active: true }),
          Partner.countDocuments({ active: true }),
          Testimonial.countDocuments({ active: true }),
        ]);
      return {
        data: { users, quizzes, quizAttempts, gallery, partners, testimonials },
        isLive: true,
      };
    },
    { data: EMPTY_COUNTS, isLive: false },
  );
}

/**
 * Replace an editorial figure with its live counter, but only once that counter
 * has something to show — a new site must never advertise "0 students reached".
 */
/**
 * Reads the numeric part of an editorial stat like "10,000+" or "500+".
 * Returns Infinity for anything unparseable, so an odd value keeps the
 * editorial copy rather than being silently replaced by a live count.
 */
function parseEditorialValue(value: string): number {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : Number.POSITIVE_INFINITY;
}

function resolveImpact(
  block: LiveSection<HomeImpactContent>,
  counts: LiveSection<HomeCounts>,
): LiveSection<HomeImpactStat[]> {
  const stored = block.data.stats;
  const usable = Array.isArray(stored) && stored.length > 0;
  const stats = usable ? stored : DEFAULT_HOME_IMPACT.stats;

  // The editorial figure is the headline claim and always wins. A live count
  // only replaces it once it has actually overtaken it — otherwise the first
  // real signup would shrink "10,000+ students" to "1", and the same stat would
  // contradict /programs and the auth panel, which render the editorial copy.
  const resolved = stats.map((s) => {
    const live = s.source && counts.isLive ? counts.data[s.source] : 0;
    const editorial = parseEditorialValue(s.value);
    const isLive = live > 0 && live >= editorial;
    return {
      key: s.key,
      value: isLive ? numberFormat.format(live) : s.value,
      label: s.label,
      labelHi: s.labelHi,
      isLive,
    };
  });

  return {
    data: resolved,
    isLive: (usable && block.isLive) || resolved.some((s) => s.isLive),
  };
}

/** Everything the homepage needs, from the compiled defaults alone. */
function staticHomePageData(): HomePageData {
  const counts: LiveSection<HomeCounts> = { data: EMPTY_COUNTS, isLive: false };
  return {
    impact: resolveImpact({ data: DEFAULT_HOME_IMPACT, isLive: false }, counts),
    programs: { data: DEFAULT_HOME_PROGRAMS.items, isLive: false },
    pillars: { data: DEFAULT_HOME_PILLARS.items, isLive: false },
    faqs: { data: DEFAULT_HOME_FAQ.items, isLive: false },
    founder: { data: DEFAULT_HOME_FOUNDER, isLive: false },
    counts,
  };
}

export async function getHomePageData(): Promise<HomePageData> {
  try {
    const [impact, programs, pillars, faqs, founder, counts] = await Promise.all([
      getBlock<HomeImpactContent>(CONTENT_KEYS.homeImpact, DEFAULT_HOME_IMPACT),
      getBlock<HomeProgramsContent>(CONTENT_KEYS.homePrograms, DEFAULT_HOME_PROGRAMS),
      getBlock<HomePillarsContent>(CONTENT_KEYS.homePillars, DEFAULT_HOME_PILLARS),
      getBlock<HomeFaqContent>(CONTENT_KEYS.homeFaq, DEFAULT_HOME_FAQ),
      getBlock<FounderContent>(CONTENT_KEYS.homeFounder, DEFAULT_HOME_FOUNDER),
      getCounts(),
    ]);

    return {
      impact: resolveImpact(impact, counts),
      programs: toList(programs, DEFAULT_HOME_PROGRAMS.items),
      pillars: toList(pillars, DEFAULT_HOME_PILLARS.items),
      faqs: toList(faqs, DEFAULT_HOME_FAQ.items),
      founder: founder.data.quote ? founder : { data: DEFAULT_HOME_FOUNDER, isLive: false },
      counts,
    };
  } catch (err) {
    // The reads above already swallow DB failures; this guarantees the contract.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[site-data.service] getHomePageData failed:", (err as Error).message);
    }
    return staticHomePageData();
  }
}
