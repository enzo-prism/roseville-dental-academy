"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const cookieStorageKey = "rda-cookie-accepted";

export function LiveCookieBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (!cancelled) {
        setDismissed(window.localStorage.getItem(cookieStorageKey) === "true");
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  if (dismissed) {
    return null;
  }

  return (
    <Card
      className="rda-cookie-banner border-border bg-primary text-primary-foreground shadow-lg"
      data-aid="FOOTER_COOKIE_BANNER_RENDERED"
    >
      <CardContent>
        <h2>This website uses cookies.</h2>
        <p>
          We use cookies to analyze website traffic and optimize your website experience. By
          accepting our use of cookies, your data will be aggregated with all other user data.
        </p>
        <Button
          data-aid="FOOTER_COOKIE_CLOSE_RENDERED"
          onClick={() => {
            window.localStorage.setItem(cookieStorageKey, "true");
            setDismissed(true);
          }}
          type="button"
          variant="secondary"
        >
          Accept
        </Button>
      </CardContent>
    </Card>
  );
}
