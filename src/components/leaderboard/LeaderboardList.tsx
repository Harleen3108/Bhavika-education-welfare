import { Avatar } from "@/components/ui/Avatar";
import { cn, formatPoints } from "@/lib/utils";

export type LeaderRow = {
  rank: number;
  name: string;
  points: number;
  avatarUrl?: string;
  isMe?: boolean;
};

const medal = ["text-amber-500", "text-ink-400", "text-amber-700"];

export function LeaderboardList({ rows }: { rows: LeaderRow[] }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={`${r.rank}-${r.name}`}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3 py-2.5",
            r.isMe ? "border-brand-300 bg-brand-50" : "border-ink-100 bg-white",
          )}
        >
          <span
            className={cn(
              "w-7 shrink-0 text-center font-display text-lg font-bold",
              r.rank <= 3 ? medal[r.rank - 1] : "text-ink-400",
            )}
          >
            {r.rank}
          </span>
          <Avatar src={r.avatarUrl} name={r.name} size={36} className="h-9 w-9 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800 sm:text-base">
            {r.name} {r.isMe && <span className="text-xs text-brand-700">(You)</span>}
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-brand-700">
            {formatPoints(r.points)}
          </span>
        </li>
      ))}
    </ul>
  );
}
