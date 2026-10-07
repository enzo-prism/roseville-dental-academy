import { expect, test } from "@playwright/test";

import {
  DEFAULT_META_PIXEL_ID,
  getMetaBrowserPixelIds,
  getMetaMeasurementAllowedCode,
  getMetaPixelBootstrapCode,
  getMetaPixelId,
  getMetaSecondaryPixelId,
  META_PIXEL_SCRIPT_SRC,
} from "@/lib/meta-pixel-config";

const SECONDARY_PIXEL_ID = "999888777666555";

function withPixelEnv(values: {
  primary?: string | undefined;
  secondary?: string | undefined;
}, run: () => void) {
  const previousPrimary = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const previousSecondary = process.env.NEXT_PUBLIC_META_SECONDARY_PIXEL_ID;
  try {
    if (values.primary === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = values.primary;
    if (values.secondary === undefined) delete process.env.NEXT_PUBLIC_META_SECONDARY_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_SECONDARY_PIXEL_ID = values.secondary;
    run();
  } finally {
    if (previousPrimary === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = previousPrimary;
    if (previousSecondary === undefined) delete process.env.NEXT_PUBLIC_META_SECONDARY_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_SECONDARY_PIXEL_ID = previousSecondary;
  }
}

const UNSET_BOOTSTRAP = `
    if (!${getMetaMeasurementAllowedCode()}) {
      if (window.fbq) window.fbq('consent', 'revoke');
    } else {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    ${JSON.stringify(META_PIXEL_SCRIPT_SRC)});

    fbq('init', ${JSON.stringify(DEFAULT_META_PIXEL_ID)});
    fbq('track', 'PageView');
    }
  `.trim();

test.describe("optional secondary Meta Pixel config", () => {
  test("unset secondary keeps the historical single-pixel bootstrap byte-for-byte", () => {
    withPixelEnv({ secondary: undefined }, () => {
      expect(getMetaPixelId()).toBe(DEFAULT_META_PIXEL_ID);
      expect(getMetaSecondaryPixelId()).toBe("");
      expect(getMetaBrowserPixelIds()).toEqual([DEFAULT_META_PIXEL_ID]);
      expect(getMetaPixelBootstrapCode()).toBe(UNSET_BOOTSTRAP);
    });
  });

  test("blank or whitespace secondary is treated as unset", () => {
    withPixelEnv({ secondary: "   " }, () => {
      expect(getMetaSecondaryPixelId()).toBe("");
      expect(getMetaBrowserPixelIds()).toEqual([DEFAULT_META_PIXEL_ID]);
      expect(getMetaPixelBootstrapCode()).toBe(UNSET_BOOTSTRAP);
    });
  });

  test("secondary equal to primary is treated as unset", () => {
    withPixelEnv({ secondary: DEFAULT_META_PIXEL_ID }, () => {
      expect(getMetaSecondaryPixelId()).toBe("");
      expect(getMetaBrowserPixelIds()).toEqual([DEFAULT_META_PIXEL_ID]);
      expect(getMetaPixelBootstrapCode()).toBe(UNSET_BOOTSTRAP);
    });
  });

  test("secondary equal to an overridden primary is treated as unset", () => {
    withPixelEnv({ primary: "9876543210123", secondary: "9876543210123" }, () => {
      expect(getMetaPixelId()).toBe("9876543210123");
      expect(getMetaSecondaryPixelId()).toBe("");
      expect(getMetaBrowserPixelIds()).toEqual(["9876543210123"]);
      expect(getMetaPixelBootstrapCode()).not.toContain("trackSingle");
      expect(getMetaPixelBootstrapCode()).toContain(`fbq('init', "9876543210123");`);
      expect(getMetaPixelBootstrapCode()).toContain("fbq('track', 'PageView');");
    });
  });

  test("distinct secondary inits both pixels and uses trackSingle for PageView", () => {
    withPixelEnv({ secondary: SECONDARY_PIXEL_ID }, () => {
      expect(getMetaSecondaryPixelId()).toBe(SECONDARY_PIXEL_ID);
      expect(getMetaBrowserPixelIds()).toEqual([DEFAULT_META_PIXEL_ID, SECONDARY_PIXEL_ID]);
      const snippet = getMetaPixelBootstrapCode();
      expect(snippet).not.toBe(UNSET_BOOTSTRAP);
      expect(snippet).toContain(`fbq('init', ${JSON.stringify(DEFAULT_META_PIXEL_ID)});`);
      expect(snippet).toContain(`fbq('init', ${JSON.stringify(SECONDARY_PIXEL_ID)});`);
      expect(snippet).toContain(
        `fbq('trackSingle', ${JSON.stringify(DEFAULT_META_PIXEL_ID)}, 'PageView');`,
      );
      expect(snippet).toContain(
        `fbq('trackSingle', ${JSON.stringify(SECONDARY_PIXEL_ID)}, 'PageView');`,
      );
      expect(snippet).not.toContain("fbq('track', 'PageView');");
    });
  });
});
