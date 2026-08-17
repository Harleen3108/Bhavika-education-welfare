/** Helpers to normalize video URLs (YouTube / Vimeo) into embed + thumbnail. */

export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

export function toEmbedUrl(url: string): string {
  const yt = getYouTubeId(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?rel=0`;
  const vimeo = getVimeoId(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  return url; // already an embed/other URL
}

export function toThumbnail(url: string, fallback?: string): string | null {
  const yt = getYouTubeId(url);
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  return fallback ?? null;
}
