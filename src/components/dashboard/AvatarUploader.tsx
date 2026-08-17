"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Hi } from "@/components/ui/Bilingual";
import { Alert } from "@/components/ui/States";
import { AVATAR, avatarFileIssue } from "@/lib/validation/profile";

type Status = "idle" | "uploading" | "removing" | "saved" | "error";

const SAVED_NOTICE = {
  uploaded: {
    en: "Photo saved — it now appears on the leaderboard.",
    hi: "फ़ोटो सेव हो गई — अब यह लीडरबोर्ड पर दिखेगी।",
  },
  removed: {
    en: "Photo removed. Your initial is shown instead.",
    hi: "फ़ोटो हटा दी गई। अब आपके नाम का पहला अक्षर दिखेगा।",
  },
} as const;

/** Narrow an unknown JSON body without reaching for `any`. */
function parseBody(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function messageFor(status: number, body: Record<string, unknown> | null): string {
  if (typeof body?.error === "string") return body.error;
  // A body-size limit tripped by the host never reaches our handler, so the
  // only clue is the bare status code.
  if (status === 413) return `Photo is too large (max ${AVATAR.maxLabel}).`;
  if (status === 401) return "Your session has expired. Please sign in again.";
  return "Upload failed. Please try again.";
}

/**
 * Choose a photo from this device, see it immediately, and have it saved to
 * Cloudinary on its own — no Save button involved.
 *
 * The photo is stored the moment the upload lands rather than being staged in
 * the profile form: it is the one field a member changes on its own, and the
 * leaderboard reads it straight from the user record.
 */
export function AvatarUploader({ value, name }: { value: string; name: string }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = React.useState(value);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status>("idle");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<keyof typeof SAVED_NOTICE>("uploaded");

  // Object URLs are held by the browser until revoked; tie each one's lifetime
  // to the state that displays it.
  React.useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const busy = status === "uploading" || status === "removing";
  const hasPhoto = Boolean(preview || avatarUrl);

  const upload = (file: File) => {
    const issue = avatarFileIssue(file);
    if (issue) {
      setStatus("error");
      setError(issue.message);
      return;
    }

    setPreview(URL.createObjectURL(file));
    setStatus("uploading");
    setProgress(0);
    setError(null);

    const body = new FormData();
    body.append("file", file);

    // fetch() cannot report how much of a request body has gone out. Members
    // are uploading megapixel phone photos over village mobile data, so a real
    // percentage is worth using the older API for.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/user/avatar");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      const json = parseBody(xhr.responseText);
      const url = typeof json?.avatarUrl === "string" ? json.avatarUrl : null;
      if (xhr.status >= 200 && xhr.status < 300 && url) {
        setAvatarUrl(url);
        setSaved("uploaded");
        setStatus("saved");
        setError(null);
        toast.success("Profile photo updated!");
        // Refresh so the sidebar avatar and the leaderboard pick up the change.
        router.refresh();
        return;
      }
      // Drop back to whatever was saved before, so the member is never shown a
      // picture the server did not accept.
      setPreview(null);
      setStatus("error");
      setError(messageFor(xhr.status, json));
    });

    xhr.addEventListener("error", () => {
      setPreview(null);
      setStatus("error");
      setError("Network error. Please check your connection and try again.");
    });

    xhr.send(body);
  };

  const remove = async () => {
    setStatus("removing");
    setError(null);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      const json = parseBody(await res.text());
      if (!res.ok) {
        setStatus("error");
        setError(messageFor(res.status, json));
        return;
      }
      setPreview(null);
      setAvatarUrl("");
      setSaved("removed");
      setStatus("saved");
      toast.success("Photo removed.");
      router.refresh();
    } catch {
      setStatus("error");
      setError("Network error. Please check your connection and try again.");
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-800">
        Profile photo{" "}
        <Hi inline className="text-ink-600">
          प्रोफ़ाइल फ़ोटो
        </Hi>
      </p>

      <div className="flex items-start gap-4 sm:gap-5">
        <div className="relative h-24 w-24 shrink-0">
          {preview ? (
            /* A blob: URL has no host, so <Avatar> would fall back to initials
               and hide the very thing we want to show. A background image keeps
               the preview out of next/image entirely. */
            <div
              aria-hidden
              className="h-24 w-24 rounded-full bg-ink-100 bg-cover bg-center"
              style={{ backgroundImage: `url("${preview}")` }}
            />
          ) : (
            <Avatar src={avatarUrl} name={name} size={96} className="h-24 w-24" />
          )}

          {status === "uploading" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-900/65 text-sm font-semibold text-white">
              {progress}%
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2.5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              <Camera size={16} aria-hidden />
              {hasPhoto ? "Change photo" : "Upload photo"}
            </Button>
            {hasPhoto && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={remove}
                loading={status === "removing"}
                disabled={busy}
              >
                <Trash2 size={16} aria-hidden />
                Remove
              </Button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={AVATAR.accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Clear first, or picking the same file twice fires no change event.
              e.target.value = "";
              if (file) upload(file);
            }}
          />

          <p className="text-sm text-ink-500">
            JPG, PNG, WebP or AVIF · up to {AVATAR.maxLabel}
          </p>
          <Hi className="block text-sm text-ink-600">
            अपने कंप्यूटर से फ़ोटो चुनें — यह लीडरबोर्ड पर आपके नाम के साथ दिखेगी।
          </Hi>

          {status === "uploading" && (
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-200"
            >
              <div
                className="h-full rounded-full bg-brand-700 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {status === "error" && error && (
        <Alert tone="danger" className="mt-4">
          {error} <Hi inline>कृपया दोबारा कोशिश करें।</Hi>
        </Alert>
      )}

      {status === "saved" && (
        <Alert tone="success" className="mt-4">
          {SAVED_NOTICE[saved].en} <Hi inline>{SAVED_NOTICE[saved].hi}</Hi>
        </Alert>
      )}
    </div>
  );
}
