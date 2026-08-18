/**
 * Shared enums used by both server (Mongoose models, services) and client (UI labels).
 * Keep this file free of any server-only imports so it is safe in client components.
 */

export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AccountStatus = {
  PENDING: "PENDING", // registered, email not verified
  ACTIVE: "ACTIVE", // verified & in good standing
  SUSPENDED: "SUSPENDED", // temporary restriction
  BLOCKED: "BLOCKED", // permanent restriction
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const PointSource = {
  QUIZ: "QUIZ",
  REFERRAL: "REFERRAL",
  ACTIVITY: "ACTIVITY",
  ADJUSTMENT: "ADJUSTMENT", // manual admin adjustment (audited)
  FUTURE_REDEMPTION: "FUTURE_REDEMPTION", // Phase 2 (Jai Maa Durga)
} as const;
export type PointSource = (typeof PointSource)[keyof typeof PointSource];

export const TransactionType = {
  CREDIT: "CREDIT",
  DEBIT: "DEBIT",
  REVERSAL: "REVERSAL",
  HOLD: "HOLD",
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionStatus = {
  COMPLETED: "COMPLETED",
  PENDING: "PENDING",
  FAILED: "FAILED",
  REVERSED: "REVERSED",
} as const;
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const QuizType = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
} as const;
export type QuizType = (typeof QuizType)[keyof typeof QuizType];

export const QuizStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type QuizStatus = (typeof QuizStatus)[keyof typeof QuizStatus];

export const AttemptStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  EXPIRED: "EXPIRED", // auto-submitted / abandoned after expiry
} as const;
export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus];

export const ReferralStatus = {
  PENDING: "PENDING", // relationship recorded, not yet qualified
  QUALIFIED: "QUALIFIED", // met eligibility, reward not yet paid
  REWARDED: "REWARDED", // reward paid exactly once
  REJECTED: "REJECTED", // fraud / ineligible
} as const;
export type ReferralStatus = (typeof ReferralStatus)[keyof typeof ReferralStatus];

export const ContactStatus = {
  NEW: "NEW",
  READ: "READ",
  RESPONDED: "RESPONDED",
  SPAM: "SPAM",
} as const;
export type ContactStatus = (typeof ContactStatus)[keyof typeof ContactStatus];

export const LeaderboardPeriod = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  ALL_TIME: "ALL_TIME",
} as const;
export type LeaderboardPeriod = (typeof LeaderboardPeriod)[keyof typeof LeaderboardPeriod];

export const CouponStatus = {
  ACTIVE: "ACTIVE", // issued, unused, not yet past expiresAt
  REDEEMED: "REDEEMED", // spent at the partner store (exactly once)
  EXPIRED: "EXPIRED", // lapsed unused — points are forfeited, never refunded
} as const;
export type CouponStatus = (typeof CouponStatus)[keyof typeof CouponStatus];

/**
 * Where a coupon's value came from. Printed on the coupon ("Generated From:
 * Points") per the written specification, which is also why this is an enum
 * with a single member today: a future promotional or admin-granted coupon is
 * then a new value here rather than a schema change.
 */
export const CouponSource = {
  POINTS: "POINTS",
} as const;
export type CouponSource = (typeof CouponSource)[keyof typeof CouponSource];

export const IntegrationStatus = {
  INITIATED: "INITIATED",
  VERIFIED: "VERIFIED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  DISABLED: "DISABLED", // Phase 1 default — redemption not yet live
} as const;
export type IntegrationStatus = (typeof IntegrationStatus)[keyof typeof IntegrationStatus];
