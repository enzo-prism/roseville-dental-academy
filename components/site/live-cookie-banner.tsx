"use client";

import { useEffect, useState } from "react";

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
    <section className="rda-cookie-banner" data-aid="FOOTER_COOKIE_BANNER_RENDERED">
      <h2>This website uses cookies.</h2>
      <p>
        We use cookies to analyze website traffic and optimize your website experience. By
        accepting our use of cookies, your data will be aggregated with all other user data.
      </p>
      <button
        data-aid="FOOTER_COOKIE_CLOSE_RENDERED"
        onClick={() => {
          window.localStorage.setItem(cookieStorageKey, "true");
          setDismissed(true);
        }}
        type="button"
      >
        Accept
      </button>
    </section>
  );
}
