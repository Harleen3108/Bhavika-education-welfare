import { PointSource, TransactionType } from "@/lib/enums";

export function sourceLabel(source: string): string {
  switch (source) {
    case PointSource.QUIZ:
      return "Quiz";
    case PointSource.REFERRAL:
      return "Referral";
    case PointSource.ACTIVITY:
      return "Activity";
    case PointSource.ADJUSTMENT:
      return "Adjustment";
    case PointSource.FUTURE_REDEMPTION:
      return "Redemption";
    default:
      return source;
  }
}

export function sourceTone(source: string): "brand" | "accent" | "neutral" | "warning" {
  switch (source) {
    case PointSource.QUIZ:
      return "brand";
    case PointSource.REFERRAL:
      return "accent";
    case PointSource.ACTIVITY:
      return "neutral";
    default:
      return "warning";
  }
}

/** Signed display: credits are +, debits/reversals are -. */
export function signedPoints(points: number, type: string): { text: string; positive: boolean } {
  const positive = type === TransactionType.CREDIT;
  const sign = positive ? "+" : "-";
  return { text: `${sign}${Math.abs(points)}`, positive };
}
