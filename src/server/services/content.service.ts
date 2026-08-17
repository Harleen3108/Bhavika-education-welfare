import "server-only";
import { dbConnect } from "@/server/db/connect";
import {
  Content,
  GalleryItem,
  Video,
  Testimonial,
  Partner,
  SystemSettings,
  type IGalleryItem,
  type IVideo,
  type ITestimonial,
  type IPartner,
} from "@/server/models";
import {
  CONTENT_KEYS,
  DEFAULT_ABOUT,
  DEFAULT_CONTACT,
  DEFAULT_MISSION_VISION,
  type AboutContent,
  type ContactInfo,
  type MissionVisionContent,
} from "@/lib/defaults";
import { DEFAULT_SETTINGS } from "@/lib/constants";

/**
 * Run a read against Mongo, returning `fallback` if the DB is unreachable
 * (e.g. during static generation without a live connection). Keeps public
 * pages resilient and buildable.
 */
async function safeRead<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    await dbConnect();
    return await fn();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[content.service] DB read failed, using fallback:", (err as Error).message);
    }
    return fallback;
  }
}

/** Merge a stored Content block over its typed default. */
async function getContentData<T extends Record<string, unknown>>(
  key: string,
  fallback: T,
): Promise<T> {
  return safeRead(async () => {
    const doc = await Content.findOne({ key }).lean();
    if (!doc?.data) return fallback;
    return { ...fallback, ...(doc.data as Partial<T>) } as T;
  }, fallback);
}

export const getAboutContent = () =>
  getContentData<AboutContent>(CONTENT_KEYS.about, DEFAULT_ABOUT);

export const getMissionVision = () =>
  getContentData<MissionVisionContent>(CONTENT_KEYS.missionVision, DEFAULT_MISSION_VISION);

export const getContactInfo = () =>
  getContentData<ContactInfo>(CONTENT_KEYS.contactInfo, DEFAULT_CONTACT);

// ---- Collections (plain, serialisable objects for client components) ----

export type GalleryDTO = Pick<
  IGalleryItem,
  "title" | "description" | "category" | "imageUrl" | "width" | "height"
> & { id: string };

export async function getGallery(category?: string): Promise<GalleryDTO[]> {
  return safeRead(async () => {
    const q: Record<string, unknown> = { active: true };
    if (category) q.category = category;
    const items = await GalleryItem.find(q).sort({ order: 1, createdAt: -1 }).lean();
    return items.map((i) => ({
      id: i._id.toString(),
      title: i.title,
      description: i.description,
      category: i.category,
      imageUrl: i.imageUrl,
      width: i.width,
      height: i.height,
    }));
  }, []);
}

export async function getGalleryCategories(): Promise<string[]> {
  return safeRead(async () => {
    const cats = await GalleryItem.distinct("category", { active: true });
    return (cats as (string | null)[]).filter((c): c is string => Boolean(c));
  }, []);
}

export type VideoDTO = Pick<
  IVideo,
  "title" | "description" | "category" | "videoUrl" | "thumbnailUrl"
> & { id: string };

export async function getVideos(): Promise<VideoDTO[]> {
  return safeRead(async () => {
    const items = await Video.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean();
    return items.map((v) => ({
      id: v._id.toString(),
      title: v.title,
      description: v.description,
      category: v.category,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
    }));
  }, []);
}

export type TestimonialDTO = Pick<ITestimonial, "name" | "role" | "message" | "imageUrl"> & {
  id: string;
};

export async function getTestimonials(limit?: number): Promise<TestimonialDTO[]> {
  return safeRead(async () => {
    let query = Testimonial.find({ active: true }).sort({ order: 1, createdAt: -1 });
    if (limit) query = query.limit(limit);
    const items = await query.lean();
    return items.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      role: t.role,
      message: t.message,
      imageUrl: t.imageUrl,
    }));
  }, []);
}

export type PartnerDTO = Pick<
  IPartner,
  "name" | "description" | "logoUrl" | "websiteUrl"
> & { id: string };

export async function getPartners(): Promise<PartnerDTO[]> {
  return safeRead(async () => {
    const items = await Partner.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean();
    return items.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      logoUrl: p.logoUrl,
      websiteUrl: p.websiteUrl,
    }));
  }, []);
}

/** Live business settings, falling back to compiled defaults. */
export async function getSettings() {
  return safeRead(async () => {
    const doc = await SystemSettings.findOne({ singleton: "global" }).lean();
    if (!doc) return DEFAULT_SETTINGS;
    return {
      referral: doc.referral,
      quiz: doc.quiz,
      activity: doc.activity,
      integration: doc.integration,
    };
  }, DEFAULT_SETTINGS);
}
