import { handle, ok, fail } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { uploadImage, cloudinaryConfigured } from "@/server/services/cloudinary.service";
import { UPLOAD } from "@/lib/constants";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  await requireAdmin();

  if (!cloudinaryConfigured) {
    return fail(
      "Media storage isn't configured. Add Cloudinary keys, or paste an image URL instead.",
      400,
      { code: "NO_MEDIA" },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file provided.", 400);

  if (!(UPLOAD.allowedImageTypes as readonly string[]).includes(file.type)) {
    return fail("Unsupported image type. Use JPEG, PNG, WebP or AVIF.", 415);
  }
  if (file.size > UPLOAD.maxImageBytes) {
    return fail("Image is too large (max 5 MB).", 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadImage(buffer);
  return ok(result);
});
