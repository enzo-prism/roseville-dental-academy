"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { activeSitePromo, isSitePromoActive } from "@/lib/site-promo";

const SHOW_DELAY_MS = 1500;
const LEAD_FORM_SELECTOR = [
  "form[data-rda-signup-form]",
  "form[data-rda-contact-form]",
  "form[data-rda-landing-form]",
  "form[data-rda-registration-form]",
].join(",");

function readDismissed(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "dismissed";
  } catch {
    return false;
  }
}

function isLeadFormFieldActive() {
  const active = document.activeElement;
  return active instanceof HTMLElement && Boolean(active.closest(LEAD_FORM_SELECTOR));
}

function writeDismissed(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "dismissed");
  } catch {
    // Private mode or blocked storage should not break dismiss.
  }
}

export function SitePromoDialog() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSitePromoActive(activeSitePromo, Date.now()) || readDismissed(activeSitePromo.storageKey)) {
      return undefined;
    }

    let cancelled = false;

    const openIfIdle = () => {
      if (cancelled || !isSitePromoActive(activeSitePromo, Date.now())) return;
      // Keep the modal off the lead-form submit path: if a visitor is already
      // in a form, do not cover the request button.
      if (isLeadFormFieldActive()) return;
      setReady(true);
      setOpen(true);
    };

    const timer = window.setTimeout(openIfIdle, SHOW_DELAY_MS);

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.closest(LEAD_FORM_SELECTOR)) {
        return;
      }
      cancelled = true;
      window.clearTimeout(timer);
    };

    document.addEventListener("focusin", onFocusIn);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("rda-promo-dialog-open", open);

    return () => {
      document.body.classList.remove("rda-promo-dialog-open");
    };
  }, [open]);

  function dismiss() {
    writeDismissed(activeSitePromo.storageKey);
    setOpen(false);
  }

  if (!ready) {
    return null;
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          dismiss();
        }
      }}
    >
      <AlertDialogContent
        className="max-w-[min(92vw,28rem)] gap-5 rounded-lg border border-border bg-card p-6 text-card-foreground data-[size=default]:max-w-[min(92vw,28rem)] data-[size=default]:sm:max-w-md sm:max-w-md"
        data-rda-promo-dialog="true"
        onOverlayClick={dismiss}
        promoOverlay
        size="default"
      >
        <AlertDialogHeader className="gap-3 sm:place-items-start sm:text-left">
          <p className="text-sm font-semibold text-primary">{activeSitePromo.eyebrow}</p>
          <AlertDialogTitle className="font-heading text-2xl font-semibold leading-tight text-foreground">
            {activeSitePromo.headline}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {activeSitePromo.body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0 sm:justify-start">
          <Button asChild className="w-full sm:w-auto" size="lg">
            <Link
              data-rda-promo-cta="true"
              href={activeSitePromo.ctaHref}
              onClick={dismiss}
            >
              {activeSitePromo.ctaLabel}
            </Link>
          </Button>
        </AlertDialogFooter>
        <AlertDialogCancel
          aria-label="Dismiss class announcement"
          className="absolute top-3 right-3"
          size="icon-sm"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>
  );
}
