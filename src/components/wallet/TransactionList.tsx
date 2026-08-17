import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
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
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <span
              className={
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                (positive ? "bg-green-50 text-success" : "bg-red-50 text-danger")
              }
            >
              {positive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-800">{t.description}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge tone={sourceTone(t.source)}>{sourceLabel(t.source)}</Badge>
                <span className="text-xs text-ink-400">{formatDateTime(t.createdAt)}</span>
              </div>
            </div>
            <span
              className={
                "shrink-0 font-semibold " +
                (positive ? "text-success" : "text-danger")
              }
            >
              {text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
