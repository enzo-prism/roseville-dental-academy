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

function FacebookMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M13.5 21.5v-8.4h2.8l.42-3.27H13.5V7.75c0-.95.26-1.6 1.62-1.6h1.72V3.22c-.3-.04-1.3-.12-2.47-.12-2.44 0-4.12 1.49-4.12 4.24V9.8H7.5v3.3h2.75v8.4h3.25Z" />
    </svg>
  );
}

function InstagramMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M7.25 3.5h9.5A3.75 3.75 0 0 1 20.5 7.25v9.5a3.75 3.75 0 0 1-3.75 3.75h-9.5A3.75 3.75 0 0 1 3.5 16.75v-9.5A3.75 3.75 0 0 1 7.25 3.5Zm0 1.75a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2-2v-9.5a2 2 0 0 0-2-2h-9.5Zm9.88 1.31a1.06 1.06 0 1 1 0 2.12 1.06 1.06 0 0 1 0-2.12ZM12 7.75A4.25 4.25 0 1 1 7.75 12 4.25 4.25 0 0 1 12 7.75Zm0 1.75A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Z" />
    </svg>
  );
}

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
  facebook: FacebookMark,
  instagram: InstagramMark,
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
