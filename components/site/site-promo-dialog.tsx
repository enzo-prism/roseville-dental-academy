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

function readDismissed(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "dismissed";
  } catch {
    return false;
  }
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
    if (!isSitePromoActive(activeSitePromo) || readDismissed(activeSitePromo.storageKey)) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setReady(true);
      setOpen(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
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
        overlayProps={{ "data-rda-promo-overlay": "true" }}
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
          aria-label="Dismiss Saturday Academy announcement"
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
