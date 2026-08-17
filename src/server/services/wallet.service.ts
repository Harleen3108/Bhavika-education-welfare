import "server-only";
import mongoose, { type ClientSession, type Types } from "mongoose";
import { withTransaction, dbConnect } from "@/server/db/connect";
import { Wallet, WalletTransaction, type IWalletTransaction } from "@/server/models";
import { PointSource, TransactionType, TransactionStatus } from "@/lib/enums";

/** Which wallet sub-balance a source credits. Sub-balances always sum to total. */
function bucketField(source: PointSource): "quizBalance" | "referralBalance" | "activityBalance" {
  switch (source) {
    case PointSource.QUIZ:
      return "quizBalance";
    case PointSource.REFERRAL:
      return "referralBalance";
    default:
      return "activityBalance";
  }
}

export type CreditInput = {
  userId: string | Types.ObjectId;
  source: PointSource;
  points: number; // positive magnitude
  referenceType: string;
  referenceId?: string | Types.ObjectId | null;
  description: string;
  /** Deterministic key — the same economic event must always use the same key. */
  idempotencyKey: string;
  type?: TransactionType; // default CREDIT
  createdBy?: string | Types.ObjectId | null;
  meta?: Record<string, unknown>;
};

export type CreditResult = {
  transaction: IWalletTransaction;
  credited: boolean; // false = idempotent no-op (already applied)
};

/**
 * Apply a point change atomically and exactly once.
 *
 * Correctness model:
 *  - The whole operation runs in a Mongo transaction.
 *  - We first look up the idempotency key; if present, it's a no-op.
 *  - We increment the wallet, then insert the ledger row carrying the unique
 *    `idempotencyKey`. If a concurrent request already inserted that key, the
 *    insert throws a duplicate-key error, the transaction aborts (rolling back
 *    our increment), and we return the existing row as a no-op.
 *
 * Net effect: N retries / double-clicks / concurrent calls → exactly one credit.
 */
export async function creditPoints(input: CreditInput): Promise<CreditResult> {
  await dbConnect();
  const type = input.type ?? TransactionType.CREDIT;
  const delta = type === TransactionType.CREDIT ? Math.abs(input.points) : -Math.abs(input.points);
  const bucket = bucketField(input.source);
  const isQuizCredit = input.source === PointSource.QUIZ && delta > 0;

  const run = async (session: ClientSession): Promise<CreditResult> => {
    const existing = await WalletTransaction.findOne({
      idempotencyKey: input.idempotencyKey,
    }).session(session);
    if (existing) return { transaction: existing, credited: false };

    const wallet = await Wallet.findOneAndUpdate(
      { user: input.userId },
      {
        $inc: {
          totalBalance: delta,
          [bucket]: delta,
          ...(isQuizCredit ? { lifetimeQuizPoints: Math.abs(input.points) } : {}),
        },
      },
      { new: true, upsert: true, session },
    );

    const [txn] = await WalletTransaction.create(
      [
        {
          user: input.userId,
          source: input.source,
          type,
          points: delta,
          balanceAfter: wallet.totalBalance,
          referenceType: input.referenceType,
          referenceId: input.referenceId ?? null,
          description: input.description,
          status: TransactionStatus.COMPLETED,
          idempotencyKey: input.idempotencyKey,
          createdBy: input.createdBy ?? null,
          meta: input.meta,
        },
      ],
      { session },
    );

    return { transaction: txn, credited: true };
  };

  try {
    return await withTransaction(run);
  } catch (err) {
    // Duplicate idempotency key from a concurrent writer → already applied.
    if (isDuplicateKeyError(err)) {
      const existing = await WalletTransaction.findOne({
        idempotencyKey: input.idempotencyKey,
      });
      if (existing) return { transaction: existing, credited: false };
    }
    throw err;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    err instanceof mongoose.mongo.MongoServerError && err.code === 11000
  ) || (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000);
}

export type WalletDTO = {
  total: number;
  quiz: number;
  referral: number;
  activity: number;
  lifetimeQuizPoints: number;
};

export async function getWallet(userId: string): Promise<WalletDTO> {
  await dbConnect();
  const w = await Wallet.findOne({ user: userId }).lean();
  return {
    total: w?.totalBalance ?? 0,
    quiz: w?.quizBalance ?? 0,
    referral: w?.referralBalance ?? 0,
    activity: w?.activityBalance ?? 0,
    lifetimeQuizPoints: w?.lifetimeQuizPoints ?? 0,
  };
}

export type TxnDTO = {
  id: string;
  source: string;
  type: string;
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

export type TxnPage = {
  items: TxnDTO[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

const PAGE_SIZE = 15;

/** Paginated, optionally source-filtered transaction history for a user. */
export async function listTransactions(
  userId: string,
  opts: { page?: number; source?: PointSource } = {},
): Promise<TxnPage> {
  await dbConnect();
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = { user: userId };
  if (opts.source) filter.source = opts.source;

  const [items, total] = await Promise.all([
    WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    WalletTransaction.countDocuments(filter),
  ]);

  return {
    items: items.map((t) => ({
      id: t._id.toString(),
      source: t.source,
      type: t.type,
      points: t.points,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
