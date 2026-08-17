"use client";

import * as React from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryDTO } from "@/server/services/content.service";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export function GalleryGrid({
  items,
  categories,
}: {
  items: GalleryDTO[];
  categories: string[];
}) {
  const [active, setActive] = React.useState<string>("All");
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const [lightbox, setLightbox] = React.useState<number | null>(null);

  const filtered = React.useMemo(
    () => (active === "All" ? items : items.filter((i) => i.category === active)),
    [items, active],
  );
  const shown = filtered.slice(0, visible);

  const openAt = (idx: number) => setLightbox(idx);
  const close = () => setLightbox(null);
  const prev = () => setLightbox((i) => (i === null ? i : (i - 1 + filtered.length) % filtered.length));
  const next = () => setLightbox((i) => (i === null ? i : (i + 1) % filtered.length));

  // Keyboard controls for the lightbox.
  React.useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, filtered.length]);

  return (
    <div>
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => {
                setActive(c);
                setVisible(PAGE_SIZE);
              }}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active === c
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {shown.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => openAt(idx)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500"
            aria-label={`View ${item.title}`}
          >
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-xs font-medium text-white transition-transform duration-300 group-hover:translate-y-0">
              {item.title}
            </span>
          </button>
        ))}
      </div>

      {visible < filtered.length && (
        <div className="mt-10 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-brand-600 px-6 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Load more
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && filtered[lightbox] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={filtered[lightbox].title}
          onClick={close}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={close}
            aria-label="Close"
          >
            <X size={24} />
          </button>
          {filtered.length > 1 && (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
          <figure
            className="relative max-h-[85vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto h-[70vh] w-full">
              <Image
                src={filtered[lightbox].imageUrl}
                alt={filtered[lightbox].title}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>
            <figcaption className="mt-3 text-center text-white">
              <p className="font-semibold">{filtered[lightbox].title}</p>
              {filtered[lightbox].description && (
                <p className="mt-1 text-sm text-white/70">{filtered[lightbox].description}</p>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
