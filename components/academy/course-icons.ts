import { BadgeCheck, GraduationCap, HeartPulse, Radiation, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

import type { AcademyIconKey } from "@/lib/academy-catalog";

export const courseIcons: Record<AcademyIconKey, LucideIcon> = {
  "badge-check": BadgeCheck,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  radiation: Radiation,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
};
