import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getWallet, listTransactions } from "@/server/services/wallet.service";
import { PointSource } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only the sources a member is offered as a filter on their own ledger. */
const FILTERABLE = new Set<string>([
  PointSource.QUIZ,
  PointSource.REFERRAL,
  PointSource.ACTIVITY,
]);

/**
 * Balances plus one page of the transaction ledger.
 *
 * Both are scoped to `requireUser().id`, never to an id in the query string —
 * one member must not be able to read another's ledger.
 */
export const GET = handle(async (req) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;

  const page = Math.max(1, Number(sp.get("page")) || 1);
  const rawSource = sp.get("source");
  const source =
    rawSource && FILTERABLE.has(rawSource) ? (rawSource as PointSource) : undefined;

  const [wallet, transactions] = await Promise.all([
    getWallet(user.id),
    listTransactions(user.id, { page, source }),
  ]);

  return ok({ wallet, transactions });
});
