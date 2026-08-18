/**
 * Human labels for the dotted action keys written to the admin audit log.
 *
 * The log stores machine keys (`wallet.adjust`) because they are stable and
 * queryable, but the admin dashboard was rendering them raw, so the activity
 * feed read like a stack trace. This is the display layer for them.
 *
 * `auditLabel` never returns the raw key: an action added later that nobody
 * remembered to list here still degrades to readable words rather than
 * reintroducing the problem.
 */

const LABELS: Record<string, string> = {
  "contact.status": "Contact status changed",
  "content.update": "Page content updated",

  "gallery.create": "Gallery photo added",
  "gallery.update": "Gallery photo edited",
  "gallery.delete": "Gallery photo removed",

  "partner.create": "Partner added",
  "partner.update": "Partner edited",
  "partner.delete": "Partner removed",

  "quiz.create": "Quiz created",
  "quiz.update": "Quiz edited",
  "quiz.delete": "Quiz deleted",
  "quiz.status": "Quiz status changed",
  "quiz.import": "Quiz questions imported",

  "testimonial.create": "Testimonial added",
  "testimonial.update": "Testimonial edited",
  "testimonial.delete": "Testimonial removed",

  "video.create": "Video added",
  "video.update": "Video edited",
  "video.delete": "Video removed",

  "user.create": "Member created",
  "user.status": "Member status changed",
  "user.verify": "Member email verified",

  "wallet.adjust": "Wallet adjusted",
  "settings.update": "Settings updated",
};

/** The subject an action acts on, used to colour-code the feed. */
export type AuditGroup =
  | "member"
  | "money"
  | "quiz"
  | "content"
  | "settings"
  | "other";

const GROUPS: Record<string, AuditGroup> = {
  user: "member",
  wallet: "money",
  coupon: "money",
  quiz: "quiz",
  gallery: "content",
  partner: "content",
  testimonial: "content",
  video: "content",
  content: "content",
  contact: "content",
  settings: "settings",
};

/** Turns `wallet.adjust` into "Wallet adjusted", or "Wallet adjust" if unlisted. */
export function auditLabel(action: string): string {
  const known = LABELS[action];
  if (known) return known;

  const words = action.replace(/[._-]+/g, " ").trim();
  if (!words) return "Admin action";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The part before the dot, mapped to a display group. */
export function auditGroup(action: string): AuditGroup {
  return GROUPS[action.split(".")[0]] ?? "other";
}
