"use client";

import { track as trackVercelEvent } from "@vercel/analytics";
import { useEffect } from "react";

import { trackGaEvent } from "@/components/site/google-analytics";
import { trackMetaPixelEvent } from "@/components/site/meta-pixel";
import {
  LEAD_FORM_SUCCESS_EVENT,
  type LeadFormSuccessDetail,
} from "@/components/site/use-lead-form";
import { CONTACT_CHANNEL_SOURCE, type ContactChannelSource } from "@/lib/site-data";

type AnalyticsValue = boolean | number | string | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

const MAX_ANALYTICS_VALUE_LENGTH = 255;

function compactText(value: string | null | undefined, fallback = "unknown") {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, MAX_ANALYTICS_VALUE_LENGTH);
}

function slugValue(value: string | null | undefined, fallback = "unknown") {
  const slug = compactText(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return (slug || fallback).slice(0, MAX_ANALYTICS_VALUE_LENGTH);
}

function safeProperties(properties: AnalyticsProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter((entry): entry is [string, Exclude<AnalyticsValue, undefined>] => entry[1] !== undefined)
      .map(([key, value]) => [
        slugValue(key),
        typeof value === "string" ? compactText(value) : value,
      ]),
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getLocation(element: Element) {
  if (element.closest("[data-rda-shell-header='true']")) {
    return "header";
  }

  if (element.closest("[data-rda-shell-footer='true']")) {
    return "footer";
  }

  if (element.closest("[data-rda-home-hero='true']")) {
    return "home_hero";
  }

  if (element.closest("[data-rda-signup-section='true']")) {
    return "quick_signup";
  }

  if (element.closest(".rda-contact-section")) {
    return "contact_section";
  }

  const stableWidget = element.closest<HTMLElement>("[data-rda-stable-widget]");

  if (stableWidget?.dataset.rdaStableWidget) {
    return stableWidget.dataset.rdaStableWidget;
  }

  if (element.closest(".rda-snapshot-content")) {
    return "snapshot_content";
  }

  return "body";
}

function getLinkLabel(link: HTMLAnchorElement) {
  return compactText(link.textContent || link.getAttribute("aria-label"), "unlabeled_link");
}

function getDestination(href: string) {
  try {
    const url = new URL(href, window.location.href);

    if (url.protocol === "tel:") {
      return "phone";
    }

    if (url.protocol === "mailto:") {
      return "email";
    }

    if (url.origin === window.location.origin) {
      return compactText(`${url.pathname}${url.hash}`);
    }

    return compactText(`${url.hostname}${url.pathname}`);
  } catch {
    return compactText(href.split("?")[0]?.split("#")[0]);
  }
}

function isGoogleMapsLink(link: HTMLAnchorElement) {
  return /google\.com\/maps|maps\.google\.com/i.test(link.href);
}

function isPdfLink(link: HTMLAnchorElement) {
  return /\.pdf(?:$|[?#])/i.test(link.href);
}

function isResumePortalLink(link: HTMLAnchorElement, href: string) {
  const decodedHref = safeDecode(href);

  return /resume-portal/i.test(decodedHref) || /rosevilledental\.godaddysites\.com\/m\/login/i.test(link.href);
}

function getFileName(link: HTMLAnchorElement) {
  try {
    const url = new URL(link.href);
    const lastSegment = url.pathname.split("/").filter(Boolean).at(-1);

    return compactText(safeDecode(lastSegment || "download"));
  } catch {
    return "download";
  }
}

function trackSafeGaEvent(eventName: string, properties?: AnalyticsProperties) {
  trackGaEvent(slugValue(eventName), safeProperties(properties));
}

export function trackSiteEvent(eventName: string, properties?: AnalyticsProperties) {
  trackVercelEvent(slugValue(eventName), safeProperties(properties));
}

function trackGaSelectContent(
  contentType: string,
  contentId: string,
  properties?: AnalyticsProperties,
) {
  trackSafeGaEvent("select_content", {
    ...properties,
    content_id: slugValue(contentId, "content"),
    content_type: contentType,
  });
}

function trackGaCtaClick(
  ctaId: string,
  location: string,
  destination: string,
  properties: AnalyticsProperties = {},
) {
  trackSafeGaEvent("cta_click", {
    ...properties,
    cta_id: ctaId,
    cta_location: location,
    link_url: destination,
  });
  trackGaSelectContent("cta", ctaId, {
    ...properties,
    link_location: location,
    link_url: destination,
  });
}

function trackGaContactAction(
  action: string,
  location: string,
  properties?: AnalyticsProperties,
) {
  trackSafeGaEvent("contact_action", {
    ...properties,
    contact_method: action,
    link_location: location,
  });
}

function getUnattributedContactChannel(channel: Extract<ContactChannelSource, "phone" | "whatsapp">) {
  const source = CONTACT_CHANNEL_SOURCE[channel];

  return {
    how_heard: source.howHeard,
    lead_source: source.leadSource,
  };
}

function trackClickEvent(target: Element) {
  const link = target.closest<HTMLAnchorElement>("a[href]");

  if (link) {
    const href = link.getAttribute("href") || "";
    const label = getLinkLabel(link);
    const location = getLocation(link);
    const destination = getDestination(href);
    const linkText = slugValue(label, "link");
    const socialPlatform = link.getAttribute("data-rda-social-button");

    if (socialPlatform) {
      const platform = slugValue(socialPlatform);

      trackSiteEvent("social_click", {
        destination,
        location,
        platform,
      });
      trackSafeGaEvent("social_click", {
        link_location: location,
        link_url: destination,
        method: platform,
        social_platform: platform,
      });
      trackGaSelectContent("social_link", platform, {
        link_location: location,
        link_url: destination,
      });
      return;
    }

    if (isResumePortalLink(link, href)) {
      trackSiteEvent("portal_click", {
        destination,
        location,
        portal: "resume",
      });
      trackSafeGaEvent("portal_click", {
        link_location: location,
        link_url: destination,
        portal: "resume",
      });
      trackGaSelectContent("portal_link", "resume_portal", {
        link_location: location,
        link_url: destination,
      });
      return;
    }

    if (link.matches("[data-rda-ad-landing-cta='true']")) {
      const campaignIntent = link.getAttribute("data-rda-campaign-intent") || undefined;
      const landingPage = link.getAttribute("data-rda-landing-page") || undefined;

      trackSiteEvent("cta_click", {
        campaign_intent: campaignIntent,
        cta: "ad_landing_form",
        destination,
        landing_page: landingPage,
        location: "ad_hero",
      });
      trackGaCtaClick("ad_landing_form", "ad_hero", destination, {
        campaign_intent: campaignIntent,
        landing_page: landingPage,
      });
      return;
    }

    if (link.matches("[data-rda-home-hero-signup='true']")) {
      trackSiteEvent("cta_click", {
        cta: "home_hero_signup",
        destination,
        location,
      });
      trackGaCtaClick("home_hero_signup", location, destination);
      return;
    }

    if (link.matches("[data-rda-contact-us='true']")) {
      trackSiteEvent("cta_click", {
        cta: "contact_us",
        destination,
        location,
      });
      trackGaCtaClick("contact_us", location, destination);
      return;
    }

    if (href.includes("#quick-sign-up")) {
      trackSiteEvent("cta_click", {
        cta: "quick_sign_up",
        destination,
        location,
      });
      trackGaCtaClick("quick_sign_up", location, destination);
      return;
    }

    if (href.startsWith("tel:")) {
      const channel = getUnattributedContactChannel("phone");

      trackSiteEvent("contact_action", {
        action: "call",
        destination: "phone",
        location,
        ...channel,
      });
      trackGaContactAction("phone", location, {
        ...channel,
        link_text: linkText,
        link_url: destination,
      });
      trackSafeGaEvent("click_to_call", {
        ...channel,
        contact_method: "phone",
        link_location: location,
        link_text: linkText,
        link_url: destination,
      });
      trackMetaPixelEvent("Contact", {
        ...channel,
        content_category: "contact",
        content_name: "call",
        link_location: location,
      });
      return;
    }

    if (href.startsWith("mailto:")) {
      trackSiteEvent("contact_action", {
        action: "email",
        destination: "email",
        location,
      });
      trackGaContactAction("email", location, {
        link_text: linkText,
        link_url: destination,
      });
      trackSafeGaEvent("email_click", {
        contact_method: "email",
        link_location: location,
        link_text: linkText,
        link_url: destination,
      });
      trackMetaPixelEvent("Contact", {
        content_category: "contact",
        content_name: "email",
        link_location: location,
      });
      return;
    }

    if (link.matches("[data-rda-whatsapp]") || href.includes("wa.me")) {
      const channel = getUnattributedContactChannel("whatsapp");

      trackSiteEvent("contact_action", {
        action: "whatsapp",
        destination: "whatsapp",
        location,
        ...channel,
      });
      trackGaContactAction("whatsapp", location, {
        ...channel,
        link_text: linkText,
        link_url: destination,
      });
      trackSafeGaEvent("whatsapp_click", {
        ...channel,
        contact_method: "whatsapp",
        link_location: location,
        link_text: linkText,
        link_url: destination,
      });
      trackMetaPixelEvent("Contact", {
        ...channel,
        content_category: "contact",
        content_name: "whatsapp",
        link_location: location,
      });
      return;
    }

    if (isGoogleMapsLink(link)) {
      trackSiteEvent("contact_action", {
        action: "directions",
        destination,
        location,
      });
      trackGaContactAction("directions", location, {
        link_text: linkText,
        link_url: destination,
      });
      trackSafeGaEvent("get_directions", {
        contact_method: "directions",
        link_location: location,
        link_text: linkText,
        link_url: destination,
      });
      return;
    }

    if (isPdfLink(link)) {
      const fileName = getFileName(link);

      trackSiteEvent("file_download", {
        file_name: fileName,
        file_type: "pdf",
        location,
      });
      trackSafeGaEvent("file_download", {
        file_extension: "pdf",
        file_name: fileName,
        link_location: location,
        link_text: linkText,
        link_url: destination,
      });
      trackGaSelectContent("file_download", fileName, {
        link_location: location,
        link_url: destination,
      });
      return;
    }

    if (location === "header" || location === "footer") {
      const navLabel = slugValue(label, "nav_link");

      trackSiteEvent("nav_click", {
        destination,
        label: navLabel,
        location,
      });
      trackSafeGaEvent("nav_click", {
        link_location: location,
        link_url: destination,
        nav_label: navLabel,
      });
      trackGaSelectContent("navigation", navLabel, {
        link_location: location,
        link_url: destination,
      });
      return;
    }

    if (link.hostname && link.hostname !== window.location.hostname) {
      trackSiteEvent("outbound_click", {
        destination,
        domain: link.hostname,
        location,
      });
      trackSafeGaEvent("outbound_click", {
        link_domain: link.hostname,
        link_location: location,
        link_text: linkText,
        link_url: destination,
        outbound: true,
      });
    }
  }

  const button = target.closest<HTMLButtonElement>("button");

  if (button?.matches("[data-rda-contact-form-toggle='true']")) {
    trackSiteEvent("contact_action", {
      action: "open_form",
      destination: "contact_form",
      location: getLocation(button),
    });
    trackGaContactAction("form", getLocation(button), {
      link_text: "drop_us_a_line",
      link_url: "contact_form",
    });
    trackGaCtaClick("drop_us_a_line", getLocation(button), "contact_form");
    return;
  }
}

function getFormValues(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => slugValue(value));
}

function getFormValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function optionalCompactValue(value: string | undefined) {
  return value ? compactText(value) : undefined;
}

function optionalSlugValue(value: string | undefined) {
  return value ? slugValue(value) : undefined;
}

function summarizeSelectedItems(values: string[]) {
  if (!values.length) {
    return undefined;
  }

  return compactText(values.slice(0, 4).join(","));
}

function getFormSource(formData: FormData) {
  const source = formData.get("Source page") || formData.get("Page source");

  return typeof source === "string" ? compactText(source, document.title) : compactText(document.title);
}

function getLeadFormName(formId: string) {
  if (formId === "ad_landing_lead") {
    return "Ad Landing Lead";
  }

  if (formId === "quick_sign_up") {
    return "Quick Sign Up";
  }

  if (formId === "registration_request") {
    return "Registration Request";
  }

  return "Contact Form";
}

function trackLeadSubmit(formId: string, formData: FormData, selectedItems: string[] = []) {
  const leadSource = slugValue(`website_${formId}`);
  const sourcePage = slugValue(getFormSource(formData), "website");
  const campaignContext = {
    campaign_intent: optionalSlugValue(getFormValue(formData, "campaign_intent")),
    course_interest: optionalCompactValue(getFormValue(formData, "course_interest")),
    landing_page: optionalCompactValue(getFormValue(formData, "landing_page")),
    page_path: optionalCompactValue(getFormValue(formData, "page_path")),
    lead_event_id: optionalCompactValue(getFormValue(formData, "lead_event_id")),
    utm_campaign: optionalSlugValue(getFormValue(formData, "utm_campaign")),
    utm_content: optionalSlugValue(getFormValue(formData, "utm_content")),
    utm_id: optionalSlugValue(getFormValue(formData, "utm_id")),
    utm_medium: optionalSlugValue(getFormValue(formData, "utm_medium")),
    utm_source: optionalSlugValue(getFormValue(formData, "utm_source")),
    utm_source_platform: optionalSlugValue(getFormValue(formData, "utm_source_platform")),
    utm_term: optionalSlugValue(getFormValue(formData, "utm_term")),
    ad_id: optionalCompactValue(getFormValue(formData, "ad_id")),
    renewal_focus: optionalSlugValue(getFormValue(formData, "Renewal focus")),
  };

  trackSiteEvent("lead_form_submit", {
    ...campaignContext,
    form_id: formId,
    selected_count: selectedItems.length || undefined,
    selected_items: summarizeSelectedItems(selectedItems),
    source: getFormSource(formData),
  });
  trackSafeGaEvent("generate_lead", {
    ...campaignContext,
    form_id: formId,
    form_name: getLeadFormName(formId),
    lead_source: leadSource,
    lead_type: formId,
    selected_count: selectedItems.length || undefined,
    selected_items: summarizeSelectedItems(selectedItems),
    source_page: sourcePage,
  });
  trackSafeGaEvent("lead_form_submit", {
    ...campaignContext,
    form_id: formId,
    lead_source: leadSource,
    lead_type: formId,
    selected_count: selectedItems.length || undefined,
    selected_items: summarizeSelectedItems(selectedItems),
    source_page: sourcePage,
  });
  trackMetaPixelEvent(
    "Lead",
    {
      ...campaignContext,
      content_category: formId,
      content_name: getLeadFormName(formId),
      selected_count: selectedItems.length || undefined,
      selected_items: summarizeSelectedItems(selectedItems),
      source_page: sourcePage,
    },
    { eventID: campaignContext.lead_event_id },
  );
}

function trackLeadInvalid(formId: string, reason: string, selectedCount = 0) {
  trackSiteEvent("lead_form_invalid", {
    form_id: formId,
    reason,
    selected_count: selectedCount,
  });
  trackSafeGaEvent("lead_form_invalid", {
    form_id: formId,
    reason,
    selected_count: selectedCount,
  });
}

function trackSubmitEvent(event: SubmitEvent) {
  if (!(event.target instanceof HTMLFormElement)) {
    return;
  }

  const form = event.target;
  const formData = new FormData(form);

  if (form.matches("[data-rda-signup-form='true']")) {
    const formId = form.getAttribute("data-rda-form-id") || "quick_sign_up";
    const interests = getFormValues(formData, "Interested classes[]");

    if (!interests.length) {
      trackLeadInvalid(formId, "missing_interest");
      return;
    }

    return;
  }

  if (
    form.matches("[data-rda-registration-form='true']") ||
    formData.get("Form type") === "Digital registration request"
  ) {
    const courses = getFormValues(formData, "Interested courses[]");
    const contactMethod = formData.get("Preferred contact method");
    const paymentPreference = formData.get("Payment preference");
    const acknowledged = formData.get("Secure follow-up acknowledgement");

    if (!courses.length || !contactMethod || !paymentPreference || !acknowledged) {
      trackLeadInvalid("registration_request", "missing_required_selection", courses.length);
      return;
    }

  }
}

function trackLeadSuccessEvent(event: Event) {
  if (!(event instanceof CustomEvent) || !(event.target instanceof HTMLFormElement)) {
    return;
  }

  const form = event.target;
  const detail = event.detail as LeadFormSuccessDetail | undefined;
  const formData = new FormData(form);

  if (detail?.leadEventId) {
    formData.set("lead_event_id", detail.leadEventId);
  }

  if (form.matches("[data-rda-signup-form='true']")) {
    const formId = form.getAttribute("data-rda-form-id") || "quick_sign_up";
    const interests = getFormValues(formData, "Interested classes[]");

    if (interests.length) {
      trackLeadSubmit(formId, formData, interests);
    }

    return;
  }

  if (form.matches("[data-rda-contact-form='true']")) {
    trackLeadSubmit("contact_form", formData);
    return;
  }

  if (
    form.matches("[data-rda-registration-form='true']") ||
    formData.get("Form type") === "Digital registration request"
  ) {
    const courses = getFormValues(formData, "Interested courses[]");

    if (courses.length) {
      trackLeadSubmit("registration_request", formData, courses);
    }
  }
}

export function InteractionAnalytics() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.target instanceof Element) {
        trackClickEvent(event.target);
      }
    }

    function onSubmit(event: SubmitEvent) {
      trackSubmitEvent(event);
    }

    function onLeadSuccess(event: Event) {
      trackLeadSuccessEvent(event);
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener(LEAD_FORM_SUCCESS_EVENT, onLeadSuccess);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener(LEAD_FORM_SUCCESS_EVENT, onLeadSuccess);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}
