import "server-only";

/**
 * Central model registry. Importing this module compiles every schema exactly
 * once (guarded against Next.js hot-reload / serverless re-imports inside each
 * model file). Import models from here so registration order is deterministic.
 */
export { User, type IUser } from "./User";
export { Wallet, type IWallet } from "./Wallet";
export { WalletTransaction, type IWalletTransaction } from "./WalletTransaction";
export { Referral, type IReferral } from "./Referral";
export { Quiz, type IQuiz, type IQuizQuestion } from "./Quiz";
export { QuizAttempt, type IQuizAttempt, type IAnswer } from "./QuizAttempt";
export { Content, type IContent } from "./Content";
export { GalleryItem, type IGalleryItem } from "./GalleryItem";
export { Video, type IVideo } from "./Video";
export { Testimonial, type ITestimonial } from "./Testimonial";
export { Partner, type IPartner } from "./Partner";
export { ContactSubmission, type IContactSubmission } from "./ContactSubmission";
export { ActivityReward, type IActivityReward } from "./ActivityReward";
export { UserActivityReward, type IUserActivityReward } from "./UserActivityReward";
export { AdminAuditLog, type IAdminAuditLog } from "./AdminAuditLog";
export { SystemSettings, type ISystemSettings } from "./SystemSettings";
export { Coupon, type ICoupon } from "./Coupon";
export {
  IntegrationTransaction,
  type IIntegrationTransaction,
} from "./IntegrationTransaction";
export { Token, type IToken, type TokenPurpose } from "./Token";
export { AdminLoginAttempt, type IAdminLoginAttempt, type AdminAuthStage } from "./AdminLoginAttempt";
export { AdminLockout, type IAdminLockout } from "./AdminLockout";
