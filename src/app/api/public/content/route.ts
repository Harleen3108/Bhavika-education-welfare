import { handle, ok, fail } from "@/server/http";
import {
  getAboutContent,
  getMissionVision,
  getContactInfo,
} from "@/server/services/content.service";

export const runtime = "nodejs";
export const revalidate = 300;

/**
 * The three editable marketing blocks, by key.
 *
 * An allowlist rather than a lookup into the whole Content collection: the
 * collection also holds admin-authored settings, and this route is public.
 */
const READERS = {
  about: getAboutContent,
  "mission-vision": getMissionVision,
  contact: getContactInfo,
} as const;

type ContentKey = keyof typeof READERS;

function isContentKey(value: string | null): value is ContentKey {
  return value !== null && value in READERS;
}

export const GET = handle(async (req) => {
  const key = new URL(req.url).searchParams.get("key");
  if (!isContentKey(key)) {
    return fail("Unknown content key.", 400, { code: "BAD_KEY" });
  }
  return ok({ key, data: await READERS[key]() });
});
