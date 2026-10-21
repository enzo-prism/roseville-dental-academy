import type { LiveRoute } from "@/lib/live-route-data";

import { LiveContactSection } from "./live-contact-section";
import { LiveSignupSection } from "./live-signup-section";

/**
 * Shared lower-page widgets for routes that are not fully React-owned pages
 * (the course pages). Home, contact, FAQs, instructors, photos, and reviews
 * render their own sections from components/academy/.
 */
export function LiveStableWidgets({ route }: { route: LiveRoute }) {
  const slots = new Set(route.widgetSlots);

  return (
    <>
      {slots.has("signup") ? (
        <LiveSignupSection compact pagePath={route.route} sourceLabel={route.title} />
      ) : null}
      {slots.has("contact") ? <LiveContactSection compact /> : null}
    </>
  );
}
