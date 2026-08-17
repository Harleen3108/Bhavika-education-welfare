"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/server/db/connect";
import {
  GalleryItem,
  Video,
  Testimonial,
  Partner,
  Content,
} from "@/server/models";
import {
  gallerySchema,
  videoSchema,
  testimonialSchema,
  partnerSchema,
  aboutContentSchema,
  missionVisionSchema,
  contactInfoSchema,
} from "@/lib/validation/admin";
import { CONTENT_KEYS } from "@/lib/defaults";
import { logAdminAction } from "@/server/services/audit.service";
import { deleteImage } from "@/server/services/cloudinary.service";
import { runAdmin, type ActionResult } from "./util";

function revalidateContent(paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

// ---------------- Gallery ----------------
export async function saveGalleryItem(input: unknown, itemId?: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const data = gallerySchema.parse(input);
    await dbConnect();
    if (itemId) {
      await GalleryItem.updateOne({ _id: itemId }, { $set: { ...data, createdBy: admin.id } });
      await logAdminAction(admin.id, "gallery.update", { targetType: "GalleryItem", targetId: itemId });
    } else {
      await GalleryItem.create({ ...data, createdBy: admin.id });
      await logAdminAction(admin.id, "gallery.create", { targetType: "GalleryItem" });
    }
    revalidateContent(["/admin/gallery", "/gallery", "/"]);
  });
}

export async function deleteGalleryItem(itemId: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    await dbConnect();
    const item = await GalleryItem.findById(itemId);
    if (item) {
      if (item.publicId) await deleteImage(item.publicId);
      await item.deleteOne();
      await logAdminAction(admin.id, "gallery.delete", { targetType: "GalleryItem", targetId: itemId });
    }
    revalidateContent(["/admin/gallery", "/gallery", "/"]);
  });
}

// ---------------- Videos ----------------
export async function saveVideo(input: unknown, itemId?: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const data = videoSchema.parse(input);
    await dbConnect();
    if (itemId) {
      await Video.updateOne({ _id: itemId }, { $set: { ...data, createdBy: admin.id } });
      await logAdminAction(admin.id, "video.update", { targetType: "Video", targetId: itemId });
    } else {
      await Video.create({ ...data, createdBy: admin.id });
      await logAdminAction(admin.id, "video.create", { targetType: "Video" });
    }
    revalidateContent(["/admin/videos", "/videos"]);
  });
}

export async function deleteVideo(itemId: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    await dbConnect();
    await Video.deleteOne({ _id: itemId });
    await logAdminAction(admin.id, "video.delete", { targetType: "Video", targetId: itemId });
    revalidateContent(["/admin/videos", "/videos"]);
  });
}

// ---------------- Testimonials ----------------
export async function saveTestimonial(input: unknown, itemId?: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const data = testimonialSchema.parse(input);
    await dbConnect();
    if (itemId) {
      await Testimonial.updateOne({ _id: itemId }, { $set: data });
      await logAdminAction(admin.id, "testimonial.update", { targetType: "Testimonial", targetId: itemId });
    } else {
      await Testimonial.create(data);
      await logAdminAction(admin.id, "testimonial.create", { targetType: "Testimonial" });
    }
    revalidateContent(["/admin/testimonials", "/testimonials", "/"]);
  });
}

export async function deleteTestimonial(itemId: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    await dbConnect();
    await Testimonial.deleteOne({ _id: itemId });
    await logAdminAction(admin.id, "testimonial.delete", { targetType: "Testimonial", targetId: itemId });
    revalidateContent(["/admin/testimonials", "/testimonials", "/"]);
  });
}

// ---------------- Partners ----------------
export async function savePartner(input: unknown, itemId?: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const data = partnerSchema.parse(input);
    await dbConnect();
    if (itemId) {
      await Partner.updateOne({ _id: itemId }, { $set: data });
      await logAdminAction(admin.id, "partner.update", { targetType: "Partner", targetId: itemId });
    } else {
      await Partner.create(data);
      await logAdminAction(admin.id, "partner.create", { targetType: "Partner" });
    }
    revalidateContent(["/admin/partners", "/partners", "/"]);
  });
}

export async function deletePartner(itemId: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    await dbConnect();
    await Partner.deleteOne({ _id: itemId });
    await logAdminAction(admin.id, "partner.delete", { targetType: "Partner", targetId: itemId });
    revalidateContent(["/admin/partners", "/partners", "/"]);
  });
}

// ---------------- CMS text content ----------------
export async function saveContent(key: string, input: unknown): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    let data: Record<string, unknown>;
    if (key === CONTENT_KEYS.about) data = aboutContentSchema.parse(input);
    else if (key === CONTENT_KEYS.missionVision) data = missionVisionSchema.parse(input);
    else if (key === CONTENT_KEYS.contactInfo) data = contactInfoSchema.parse(input);
    else throw new Error("Unknown content key");

    await dbConnect();
    await Content.updateOne(
      { key },
      { $set: { key, data, updatedBy: admin.id } },
      { upsert: true },
    );
    await logAdminAction(admin.id, "content.update", { targetType: "Content", reason: key });
    revalidateContent(["/admin/content", "/about", "/mission-vision", "/contact", "/"]);
  });
}
