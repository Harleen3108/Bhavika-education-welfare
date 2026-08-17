"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, X, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/States";

/**
 * Uploads an image to Cloudinary via the server route, with a URL-paste
 * fallback when media storage isn't configured. Controlled by `value`/`onChange`.
 */
export function ImageUploader({
  value,
  onChange,
  onPublicId,
  label = "Image",
}: {
  value: string;
  onChange: (url: string) => void;
  onPublicId?: (id: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Upload failed.");
        return;
      }
      onChange(json.url);
      onPublicId?.(json.publicId);
      toast.success("Image uploaded.");
    } catch {
      toast.error("Upload failed. You can paste an image URL instead.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-ink-800">{label}</p>
      <div className="flex items-start gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
          {value ? (
            <>
              <Image src={value} alt="" fill className="object-cover" sizes="96px" />
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  onPublicId?.("");
                }}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </>
          ) : uploading ? (
            <Spinner />
          ) : (
            <Upload size={22} className="text-ink-400" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-200 disabled:opacity-60"
          >
            <Upload size={16} /> {uploading ? "Uploading…" : "Upload image"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <div className="relative">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input
              type="url"
              placeholder="…or paste an image URL"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
