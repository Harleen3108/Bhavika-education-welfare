import {
  Award,
  BadgePercent,
  BookOpen,
  Building2,
  CalendarDays,
  Coins,
  Compass,
  Droplet,
  Eye,
  Gift,
  GraduationCap,
  HandHeart,
  Handshake,
  Heart,
  HeartHandshake,
  Laptop,
  Leaf,
  Lightbulb,
  MapPin,
  School,
  ShieldCheck,
  Shirt,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Store,
  Target,
  Ticket,
  Timer,
  Trophy,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Resolves the icon names used in `lib/site-content.ts` to components.
 *
 * The content module stays data-only (plain strings, no JSX) so it can be
 * imported anywhere; this map is the single place that binds those names to
 * real icons.
 *
 * The homepage sections now read from the Content collection, so an admin can
 * type an icon name that no compiled copy ever used. The map therefore carries
 * more names than `site-content` references — the surplus entries cover the
 * vocabulary an editor is likely to reach for when adding a programme or
 * pillar, so their choice resolves instead of silently landing on the fallback.
 */
export const ICONS: Record<string, LucideIcon> = {
  Award,
  BadgePercent,
  BookOpen,
  Building2,
  CalendarDays,
  Coins,
  Compass,
  Droplet,
  Eye,
  Gift,
  GraduationCap,
  HandHeart,
  Handshake,
  Heart,
  HeartHandshake,
  Laptop,
  Leaf,
  Lightbulb,
  MapPin,
  School,
  ShieldCheck,
  Shirt,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Store,
  Target,
  Ticket,
  Timer,
  Trophy,
  UserPlus,
  Users,
  Wrench,
};

/** Falls back to Sparkles so an unknown name never crashes a render. */
export function icon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}
