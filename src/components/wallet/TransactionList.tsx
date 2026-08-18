import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PointSource } from "@/lib/enums";
import { cn, formatDateTime } from "@/lib/utils";
import { sourceLabel, sourceTone, signedPoints } from "@/lib/points-format";

export type TxnRow = {
  id: string;
  source: string;
  type: string;
  points: number;
  description: string;
  createdAt: string;
};

export function TransactionList({ transactions }: { transactions: TxnRow[] }) {
  return (
    <ul className="divide-y divide-ink-100">
      {transactions.map((t) => {
        const { text, positive } = signedPoints(t.points, t.type);
        /*
          Descriptions are normally short and system-generated, so one clipped
          line reads fine. An adjustment is the exception: the line is an admin's
          own words behind a "Credited by admin — " prefix, and truncating at a
          phone's width throws away the reason while keeping the prefix — the
          member is left seeing that points moved but not why. Those wrap.
        */
        const isAdjustment = t.source === PointSource.ADJUSTMENT;
        /*
          The amount moves inside the text column rather than sitting as a third
          sibling. At 360px a three-across row leaves the description ~170px and
          the badge+date pair cannot fit beside it; nesting lets the amount share
          the description's line and the meta wrap freely underneath.

          min-w-0 on that column is also what keeps this list from setting a
          ~670px min-content floor, which previously forced the dashboard's
          implicit grid track to 812px and overflowed a 360px phone.
        */
        return (
          <li key={t.id} className="flex items-start gap-3 py-3">
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                positive ? "bg-green-50 text-success" : "bg-red-50 text-danger",
              )}
            >
              {positive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    "text-sm font-medium break-words text-ink-800",
                    // Two lines on a phone keeps a system description legible;
                    // the desktop row still clips to one. Adjustments never clip.
                    isAdjustment ? "break-words" : "line-clamp-2 sm:truncate",
                  )}
                >
                  {t.description}
                </p>
                <span
                  className={cn(
                    "shrink-0 font-semibold tabular-nums",
                    positive ? "text-success" : "text-danger",
                  )}
                >
                  {text}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge tone={sourceTone(t.source)}>{sourceLabel(t.source)}</Badge>
                <span className="text-xs text-ink-400">{formatDateTime(t.createdAt)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
