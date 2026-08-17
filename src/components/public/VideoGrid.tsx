"use client";

import * as React from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import type { VideoDTO } from "@/server/services/content.service";
import { toEmbedUrl, toThumbnail } from "@/lib/video";

export function VideoGrid({ videos }: { videos: VideoDTO[] }) {
  const [playing, setPlaying] = React.useState<VideoDTO | null>(null);

  React.useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPlaying(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [playing]);

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => {
          const thumb = v.thumbnailUrl || toThumbnail(v.videoUrl);
          return (
            <div key={v.id} className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
              <button
                onClick={() => setPlaying(v)}
                className="group relative block aspect-video w-full bg-ink-900"
                aria-label={`Play ${v.title}`}
              >
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={v.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    loading="lazy"
                    className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                  />
                ) : (
                  <div className="absolute inset-0 bg-brand-800" />
                )}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-lg transition-transform group-hover:scale-110">
                    <Play size={26} className="ml-1" fill="currentColor" />
                  </span>
                </span>
              </button>
              <div className="p-4">
                <h3 className="line-clamp-1 font-semibold text-ink-900">{v.title}</h3>
                {v.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-600">{v.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {playing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPlaying(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setPlaying(null)}
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <div className="aspect-video w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={toEmbedUrl(playing.videoUrl)}
              title={playing.title}
              className="h-full w-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
