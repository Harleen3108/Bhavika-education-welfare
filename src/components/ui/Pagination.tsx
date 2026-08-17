import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Link-based pager. `buildHref(page)` returns the URL for a given page. */
export function Pagination({
  page,
  pages,
  buildHref,
}: {
  page: number;
  pages: number;
  buildHref: (page: number) => string;
}) {
  if (pages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(pages, page + 1);

  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
      <PagerLink href={buildHref(prev)} disabled={page <= 1}>
        <ChevronLeft size={16} /> Prev
      </PagerLink>
      <span className="text-sm text-ink-500">
        Page {page} of {pages}
      </span>
      <PagerLink href={buildHref(next)} disabled={page >= pages}>
        Next <ChevronRight size={16} />
      </PagerLink>
    </nav>
  );
}

function PagerLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors";
  if (disabled) {
    return (
      <span className={cn(cls, "cursor-not-allowed border-ink-200 text-ink-300")} aria-disabled>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(cls, "border-brand-600 text-brand-700 hover:bg-brand-50")}>
      {children}
    </Link>
  );
}
