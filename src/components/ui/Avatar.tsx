import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A user avatar that can never crash the page.
 *
 * Avatar URLs are user-supplied, and `next/image` throws a hard runtime error
 * when it is handed a host that is not listed in `next.config.ts`. Because the
 * profile form accepts a pasted URL, any member could take down their own
 * dashboard — and the leaderboard for everyone else — simply by pointing their
 * avatar at an unlisted domain.
 *
 * So the host is checked first: known hosts go through the optimizer, anything
 * else renders as a plain <img> (correct, just unoptimized), and a missing or
 * unparseable URL falls back to the member's initial.
 */

/** Hosts declared in next.config.ts — only these may reach the optimizer. */
const OPTIMIZABLE = new Set([
  "res.cloudinary.com",
  "images.unsplash.com",
  "picsum.photos",
  "img.youtube.com",
  "i.ytimg.com",
]);

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function Avatar({
  src,
  name,
  size = 36,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const shape = cn("shrink-0 rounded-full object-cover", className);
  const box = { width: size, height: size };

  const host = src ? hostOf(src) : null;

  if (src && host && OPTIMIZABLE.has(host)) {
    return (
      <Image
        src={src}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className={shape}
        style={box}
      />
    );
  }

  if (src && host) {
    // Unknown but syntactically valid host: render it directly rather than
    // refusing to show the member's own picture.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" aria-hidden className={shape} style={box} />;
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700",
        className,
      )}
      style={{ ...box, fontSize: Math.round(size * 0.42) }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
