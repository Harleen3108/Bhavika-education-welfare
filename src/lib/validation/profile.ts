import { z } from "zod";
import { UPLOAD } from "@/lib/constants";

/**
 * The member's own editable text fields.
 *
 * `avatarUrl` is deliberately absent: the photo is owned by
 * `POST/DELETE /api/user/avatar`, which is the only writer. Keeping it out of
 * this schema means saving the text form can never clobber a photo that was
 * uploaded a moment earlier, and it retires the pasted-URL field that could
 * point next/image at an unlisted host.
 */
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d][\d\s-]{6,}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(400).optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Avatar file rules, in the shape the file picker and the API route both need. */
export const AVATAR = {
  maxBytes: UPLOAD.maxImageBytes,
  types: UPLOAD.allowedImageTypes as readonly string[],
  /** `accept` attribute for <input type="file">. */
  accept: UPLOAD.allowedImageTypes.join(","),
  maxLabel: "5 MB",
} as const;

export type AvatarFileIssue = { message: string; status: 400 | 413 | 415 };

/**
 * One implementation of the file rules, used twice on purpose: the browser
 * calls it to reject a bad file instantly without burning an upload, and the
 * route calls it again because nothing arriving over HTTP can be trusted —
 * `accept` is a hint, and both the reported size and MIME type are attacker
 * controlled.
 */
export function avatarFileIssue(file: { type: string; size: number }): AvatarFileIssue | null {
  if (!AVATAR.types.includes(file.type)) {
    return { message: "Unsupported image type. Use JPEG, PNG, WebP or AVIF.", status: 415 };
  }
  if (file.size <= 0) {
    return { message: "That file is empty. Please choose another photo.", status: 400 };
  }
  if (file.size > AVATAR.maxBytes) {
    return { message: `Photo is too large (max ${AVATAR.maxLabel}).`, status: 413 };
  }
  return null;
}
