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
  EXPIRED: "EXPIRED", // lapsed unused — points are forfeited on a time lapse
  VOID: "VOID", // deactivated by an admin — a store will not honour it (reversible)
} as const;
export type CouponStatus = (typeof CouponStatus)[keyof typeof CouponStatus];

/**
 * Where a coupon's value came from. Printed on the coupon ("Generated From:
 * Points") per the written specification.
 *
 * `ADMIN` is a coupon an administrator granted directly — a gift, a
 * compensation, a campaign — that a member did NOT pay points for. The
 * distinction is load-bearing: only a POINTS coupon has points to refund when
 * it is voided or force-expired, so refund logic keys off this field.
 */
export const CouponSource = {
  POINTS: "POINTS",
  ADMIN: "ADMIN",
} as const;
export type CouponSource = (typeof CouponSource)[keyof typeof CouponSource];

export const DonationStatus = {
  CREATED: "CREATED", // order placed, payment not yet confirmed
  PAID: "PAID", // payment captured / manually recorded — receipt available
  FAILED: "FAILED", // payment abandoned or failed
} as const;
export type DonationStatus = (typeof DonationStatus)[keyof typeof DonationStatus];

export const DonationKind = {
  DONATION: "DONATION", // a monetary gift
  VOLUNTEER: "VOLUNTEER", // an admin-issued certificate of volunteering (no money)
} as const;
export type DonationKind = (typeof DonationKind)[keyof typeof DonationKind];

export const DonationSource = {
  ONLINE: "ONLINE", // paid through Razorpay
  MANUAL: "MANUAL", // recorded by an admin (cash/offline, or a volunteer certificate)
} as const;
export type DonationSource = (typeof DonationSource)[keyof typeof DonationSource];

export const IdCardStatus = {
  PENDING: "PENDING", // member submitted KYC, awaiting admin review
  APPROVED: "APPROVED", // verified — card is downloadable and in the member's profile
  REJECTED: "REJECTED", // admin declined; member may correct and resubmit
} as const;
export type IdCardStatus = (typeof IdCardStatus)[keyof typeof IdCardStatus];

export const IntegrationStatus = {
  INITIATED: "INITIATED",
  VERIFIED: "VERIFIED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  DISABLED: "DISABLED", // Phase 1 default — redemption not yet live
} as const;
export type IntegrationStatus = (typeof IntegrationStatus)[keyof typeof IntegrationStatus];
