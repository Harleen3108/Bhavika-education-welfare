import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { env, cloudinaryConfigured } from "@/lib/env";

let configured = false;
function ensureConfig() {
  if (configured) return;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export { cloudinaryConfigured };

export async function uploadImage(
  buffer: Buffer,
  folder = env.CLOUDINARY_UPLOAD_FOLDER,
): Promise<{ url: string; publicId: string; width?: number; height?: number }> {
  if (!cloudinaryConfigured) throw new Error("Cloudinary is not configured.");
  ensureConfig();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!cloudinaryConfigured || !publicId) return;
  ensureConfig();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("[cloudinary] delete failed:", err);
  }
}
