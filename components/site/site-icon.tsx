import type { ComponentType, SVGProps } from "react";
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck2,
  Camera,
  Clock3,
  Coins,
  GraduationCap,
  HeartPulse,
  Mail,
  MapPin,
  Music2,
  Phone,
  Route,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const iconMap = {
  graduation: GraduationCap,
  briefcase: BriefcaseBusiness,
  heart: HeartPulse,
  "clipboard-check": BadgeCheck,
  shield: ShieldCheck,
  scan: ScanLine,
  "spark-star": Sparkles,
  star: Star,
  "badge-check": BadgeCheck,
  users: Users,
  coins: Coins,
  "calendar-check": CalendarCheck2,
  route: Route,
  "map-pin": MapPin,
  phone: Phone,
  mail: Mail,
  clock: Clock3,
  camera: Camera,
  "book-open": BookOpen,
  "user-star": UserRound,
  music: Music2,
} satisfies Record<string, IconComponent>;

export type SiteIconName = keyof typeof iconMap;

export function SiteIcon({
  name,
  className,
}: {
  name: SiteIconName;
  className?: string;
}) {
  const Icon = iconMap[name];
  return <Icon className={cn("size-4", className)} aria-hidden="true" />;
}
