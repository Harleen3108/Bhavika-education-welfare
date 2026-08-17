import { handle, ok, fail, DomainError } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import {
  uploadImage,
  deleteImage,
  cloudinaryConfigured,
} from "@/server/services/cloudinary.service";
import { setAvatarUrl } from "@/server/services/user.service";
import { AVATAR, avatarFileIssue } from "@/lib/validation/profile";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Member-facing avatar upload.
 *
 * Deliberately separate from `/api/admin/upload`: that route is admin-only and
 * stays that way. This one accepts any signed-in member, so every guard the
 * admin route can take for granted (who is calling, how often, what they sent)
 * is enforced explicitly below.
 */

/**
 * A member needs one or two attempts, not a hundred. Uploads cost third-party
 * quota and bandwidth, so the bucket is small and keyed by user id — keying by
 * IP would punish a whole school or village on one shared connection.
 */
const AVATAR_RATE = { limit: 10, windowSeconds: 600 };

/** Avatars live beside the rest of our media, under the configured folder. */
const AVATAR_FOLDER = `${env.CLOUDINARY_UPLOAD_FOLDER}/avatars`;

/**
 * Square, face-aware crop applied at delivery. Members upload whatever their
 * phone produced — portrait, panorama, 12 megapixels — and the leaderboard
 * needs 36px circles that all look alike. `g_face` centres on the child and
 * falls back to the centre of the frame when no face is found.
 */
const AVATAR_TRANSFORM = "c_fill,g_face,w_400,h_400,f_auto,q_auto";

const UPLOAD_MARKER = "/image/upload/";

/** Fold the crop into the delivery URL we persist. */
function squareAvatarUrl(secureUrl: string): string {
  const at = secureUrl.indexOf(UPLOAD_MARKER);
  if (at === -1) return secureUrl;
  const cut = at + UPLOAD_MARKER.length;
  return `${secureUrl.slice(0, cut)}${AVATAR_TRANSFORM}/${secureUrl.slice(cut)}`;
}

/**
 * Recover the Cloudinary public id from a URL this route produced.
 *
 * Returns null for anything else — including the pasted third-party URLs that
 * existing members still have stored. Deleting is destructive and the id is
 * derived, not recorded, so the folder check is the safety rail: we only ever
 * destroy assets that live in our own avatars folder.
 */
function ownedAvatarPublicId(url: string): string | null {
  let path: string;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "res.cloudinary.com") return null;
    path = parsed.pathname;
  } catch {
    return null;
  }

  const at = path.indexOf(UPLOAD_MARKER);
  if (at === -1) return null;

  const segments = path.slice(at + UPLOAD_MARKER.length).split("/");
  if (segments[0] === AVATAR_TRANSFORM) segments.shift();
  if (/^v\d+$/.test(segments[0] ?? "")) segments.shift();

  const publicId = segments.join("/").replace(/\.[a-z0-9]+$/i, "");
  return publicId.startsWith(`${AVATAR_FOLDER}/`) ? publicId : null;
}

/** Best effort: a failed cleanup must never fail the member's request. */
async function releasePrevious(previousUrl: string): Promise<void> {
  const publicId = previousUrl ? ownedAvatarPublicId(previousUrl) : null;
  if (publicId) await deleteImage(publicId);
}

/**
 * Content sniffing, because a declared MIME type is just a string the client
 * chose. The allowlist above decides what we accept; these magic bytes decide
 * what the file actually is.
 */
function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis" || brand === "mif1") return "image/avif";
  }
  return null;
}

/** Signed-in member + a spent unit of their upload budget. Throws otherwise. */
async function requireUploadSlot(): Promise<string> {
  const user = await requireUser();
  const rl = await rateLimit(
    `avatar:${user.id}`,
    AVATAR_RATE.limit,
    AVATAR_RATE.windowSeconds,
  );
  if (!rl.success) {
    throw new DomainError(
      "Too many photo changes. Please try again in a few minutes.",
      429,
      "RATE_LIMITED",
    );
  }
  return user.id;
}

export const POST = handle(async (req) => {
  const userId = await requireUploadSlot();

  if (!cloudinaryConfigured) {
    return fail("Photo uploads aren't available right now. Please try again later.", 503, {
      code: "NO_MEDIA",
    });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Please choose a photo to upload.", 400);

  // Size is checked before the body is read, so an oversized file is rejected
  // rather than buffered into memory first.
  const issue = avatarFileIssue(file);
  if (issue) return fail(issue.message, issue.status);

  // The declared type got us this far cheaply; the bytes have the final say.
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer);
  if (!sniffed || !AVATAR.types.includes(sniffed)) {
    return fail("That file isn't a valid JPEG, PNG, WebP or AVIF image.", 415);
  }

  const uploaded = await uploadImage(buffer, AVATAR_FOLDER);
  const avatarUrl = squareAvatarUrl(uploaded.url);
  const { previousUrl } = await setAvatarUrl(userId, avatarUrl);
  await releasePrevious(previousUrl);

  return ok({ avatarUrl });
});

export const DELETE = handle(async () => {
  const userId = await requireUploadSlot();

  const { previousUrl } = await setAvatarUrl(userId, null);
  await releasePrevious(previousUrl);

  return ok({ avatarUrl: "" });
});
