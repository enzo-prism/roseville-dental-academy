import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

import type { LeadAttribution } from "@/lib/lead-attribution";

type AttributionModule = typeof import("@/lib/lead-attribution");

// Load the actual browser module in a fresh browser-like context per test, so
// persisted visits and module-memory fallback are exercised without a network.
function browserAttribution(options: {
  blockedStorage?: boolean;
  cookies?: string;
  doNotTrack?: string;
  globalPrivacyControl?: boolean;
  local?: Map<string, string>;
  session?: Map<string, string>;
} = {}) {
  const cookies = new Map<string, string>();
  const local = options.local ?? new Map<string, string>();
  const session = options.session ?? new Map<string, string>();
  for (const cookie of (options.cookies ?? "").split(";")) {
    const [name, ...value] = cookie.trim().split("=");
    if (name) cookies.set(name, value.join("="));
  }
  const document = {
    referrer: "",
    get cookie() {
      return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(value: string) {
      if (options.blockedStorage) throw new DOMException("Blocked", "SecurityError");
      const [name, ...parts] = value.split(";", 1)[0].split("=");
      cookies.set(name, parts.join("="));
    },
  };
  const window = {
    doNotTrack: options.doNotTrack,
    location: new URL("https://rosevilledentalacademy.com/"),
  };
  for (const [name, store] of [["localStorage", local], ["sessionStorage", session]] as const) {
    Object.defineProperty(window, name, {
      get() {
        if (options.blockedStorage) throw new DOMException("Blocked", "SecurityError");
        return {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => store.set(key, value),
        };
      },
    });
  }
  const context = createContext({
    crypto: globalThis.crypto,
    Date,
    document,
    DOMException,
    navigator: {
      doNotTrack: options.doNotTrack ?? "0",
      globalPrivacyControl: options.globalPrivacyControl === true,
    },
    URL,
    URLSearchParams,
    window,
  });
  const cache = new Map<string, unknown>();
  const load = (file: string): unknown => {
    const filename = resolve(process.cwd(), file);
    if (cache.has(filename)) return cache.get(filename);
    const loadedModule = { exports: {} };
    const source = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    }).outputText;
    const factory = runInContext(`(function(require, module, exports) { ${source}\n})`, context);
    factory((name: string) => {
      if (name === "@/lib/attribution-contract") return load("lib/attribution-contract.ts");
      throw new Error(`Unexpected test import: ${name}`);
    }, loadedModule, loadedModule.exports);
    cache.set(filename, loadedModule.exports);
    return loadedModule.exports;
  };
  const api = load("lib/lead-attribution.ts") as AttributionModule;
  return {
    api,
    cookies,
    local,
    session,
    visit(path: string, capturedAt: string): LeadAttribution {
      window.location = new URL(path, "https://rosevilledentalacademy.com");
      return api.resolveLeadAttribution({ capturedAt });
    },
  };
}

const GOOGLE = "/lp/dental-assisting-enroll?utm_source=google&utm_medium=cpc&utm_campaign=google_first&gclid=google_click";
const META = "/lp/dental-assisting-enroll?utm_source=facebook&utm_medium=paid_social&utm_campaign=meta_second&utm_id=120000111&utm_content=video_sept25_clinical_120000222&fbclid=meta_click";
const FIRST = "2026-09-29T10:00:00.000Z";
const SECOND = "2026-09-29T10:10:00.000Z";

test("Google then Meta keeps complete first touch immutable and each campaign coherent", () => {
  const browser = browserAttribution();
  const initial = browser.visit(GOOGLE, FIRST);
  const later = browser.visit(META, SECOND);
  expect(later.firstTouch).toEqual(initial.firstTouch);
  expect(later.firstTouch.clickIds.fbclid).toBe("");
  expect(later.firstTouch.dimensions.ad_id).toBe("");
  expect(later.conversionTouch.clickIds.gclid).toBe("");
  expect(later.conversionTouch.clickIds.fbclid).toBe("meta_click");
  expect(later.conversionTouch.dimensions.ad_id).toBe("120000222");
  expect(later.conversionTouch.touchId).not.toBe(initial.conversionTouch.touchId);
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("google");
  expect(stamp.fbclid).toBe("");
  expect(stamp.ad_id).toBe("");
  expect(stamp.conversion_touch_ad_id).toBe("120000222");
});

test("Meta then Google does not inherit an earlier Meta click or fbc cookie", () => {
  const browser = browserAttribution();
  const initial = browser.visit(META, FIRST);
  browser.cookies.set("_fbc", "fb.1.123.meta_click");
  browser.cookies.set("_fbp", "fb.1.123.browser");
  const later = browser.visit(GOOGLE, SECOND);
  expect(later.firstTouch).toEqual(initial.firstTouch);
  expect(later.conversionTouch.clickIds.gclid).toBe("google_click");
  expect(later.conversionTouch.clickIds.fbclid).toBe("");
  expect(later.conversionTouch.clickIds.fbc).toBe("");
  expect(later.conversionTouch.clickIds.fbp).toBe("");
  expect(later.conversionTouch.dimensions.ad_id).toBe("");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.gclid).toBe("");
  expect(stamp.ad_id).toBe("120000222");
});

test("a second click on the same platform gets its own touch instead of filling first-touch gaps", () => {
  const browser = browserAttribution();
  const initial = browser.visit(META, FIRST);
  browser.cookies.set("_fbc", "fb.1.123.meta_click");
  const later = browser.visit(META.replace("meta_click", "different_click"), SECOND);
  expect(later.firstTouch).toEqual(initial.firstTouch);
  expect(later.conversionTouch.clickIds.fbclid).toBe("different_click");
  expect(later.conversionTouch.clickIds.fbc).toBe("");
  expect(later.conversionTouch.touchId).not.toBe(initial.conversionTouch.touchId);
});

test("same-visit late browser IDs fill gaps without replacing touch identity or campaign", () => {
  const browser = browserAttribution();
  const initial = browser.visit(META, FIRST);
  browser.cookies.set("_fbc", "fb.1.123.meta_click");
  browser.cookies.set("_fbp", "fb.1.123.browser");
  browser.cookies.set("_ga", "GA1.1.123.456");
  const later = browser.visit(META, SECOND);
  expect(later.firstTouch.touchId).toBe(initial.firstTouch.touchId);
  expect(later.firstTouch.capturedAt).toBe(FIRST);
  expect(later.conversionTouch.touchId).toBe(initial.conversionTouch.touchId);
  expect(later.firstTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(later.firstTouch.gaClientId).toBe("123.456");
  expect(later.firstTouch.utm).toEqual(initial.firstTouch.utm);
});

test("a later document load with the same campaign cannot enrich the original first touch", () => {
  const firstBrowser = browserAttribution();
  const initial = firstBrowser.visit(META, FIRST);
  const laterBrowser = browserAttribution({
    local: firstBrowser.local,
    session: firstBrowser.session,
    cookies: "_fbc=fb.1.123.meta_click; _ga=GA1.1.123.456",
  });
  const later = laterBrowser.visit(META, SECOND);
  expect(later.firstTouch).toEqual(initial.firstTouch);
  expect(later.conversionTouch.touchId).not.toBe(initial.conversionTouch.touchId);
  expect(later.conversionTouch.capturedAt).toBe(SECOND);
  expect(later.conversionTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
});

test("direct navigation retains the paid conversion touch without enriching an earlier page", () => {
  const browser = browserAttribution();
  const initial = browser.visit(META, FIRST);
  browser.cookies.set("_fbc", "fb.1.123.meta_click");
  const later = browser.visit("/contact", SECOND);
  expect(later.firstTouch).toEqual(initial.firstTouch);
  expect(later.conversionTouch).toEqual(initial.conversionTouch);
});

test("denial wins across every consent cookie regardless of earlier grant", () => {
  for (const denied of ["rda_attribution_consent", "rda_analytics_consent", "rda_cookie_consent"]) {
    const cookies = ["rda_attribution_consent", "rda_analytics_consent", "rda_cookie_consent"]
      .map((name) => `${name}=${name === denied ? "denied" : "granted"}`).join("; ");
    expect(browserAttribution({ cookies }).api.getAttributionConsentState()).toBe("restricted");
  }
});

test("unknown consent remains unknown and does not become server marketing consent", () => {
  const browser = browserAttribution();
  const attribution = browser.visit(META, FIRST);
  expect(attribution.consentState).toBe("unknown");
  const receipt = browser.api.buildAttributionReceipt(attribution, {
    acceptedAt: SECOND, formId: "synthetic-form", formKey: "course-info", leadEventId: "synthetic-event",
  });
  expect(receipt.firstTouch.consent.analytics).toBe(false);
  expect(receipt.conversionTouch.consent.marketing).toBe(false);
});

const META_BROWSER_COOKIES = "_fbc=fb.1.123.meta_click; _fbp=fb.1.123.browser";

function expectNoCookieMetaIds(attribution: LeadAttribution, api: AttributionModule) {
  expect(attribution.clickIds.fbclid).toBe("meta_click");
  expect(attribution.clickIds.fbc).toBe("");
  expect(attribution.clickIds.fbp).toBe("");
  expect(attribution.firstTouch.clickIds.fbc).toBe("");
  expect(attribution.firstTouch.clickIds.fbp).toBe("");
  expect(attribution.conversionTouch.clickIds.fbc).toBe("");
  expect(attribution.conversionTouch.clickIds.fbp).toBe("");
  const fields = api.getLeadAttributionFormFields(attribution);
  expect(fields.fbclid).toBe("meta_click");
  expect(fields.fbc).toBe("");
  expect(fields.fbp).toBe("");
  expect(fields.first_touch_fbc).toBe("");
  expect(fields.first_touch_fbp).toBe("");
  expect(fields.conversion_touch_fbc).toBe("");
  expect(fields.conversion_touch_fbp).toBe("");
  const receipt = api.buildAttributionReceipt(attribution, {
    acceptedAt: SECOND, formId: "synthetic-form", formKey: "course-info", leadEventId: "synthetic-event",
  });
  expect(receipt.firstTouch.clickIds.fbclid).toBe("meta_click");
  expect(receipt.firstTouch.clickIds.fbc).toBe("");
  expect(receipt.firstTouch.clickIds.fbp).toBe("");
  expect(receipt.conversionTouch.clickIds.fbc).toBe("");
  expect(receipt.conversionTouch.clickIds.fbp).toBe("");
}

test("allowed Meta fbclid visit stores matching _fbc and _fbp cookies on the touch", () => {
  const browser = browserAttribution({ cookies: META_BROWSER_COOKIES });
  const attribution = browser.visit(META, FIRST);
  expect(attribution.consentState).toBe("unknown");
  expect(attribution.conversionTouch.clickIds.fbclid).toBe("meta_click");
  expect(attribution.conversionTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(attribution.conversionTouch.clickIds.fbp).toBe("fb.1.123.browser");
  const fields = browser.api.getLeadAttributionFormFields(attribution);
  expect(fields.fbclid).toBe("meta_click");
  expect(fields.fbc).toBe("fb.1.123.meta_click");
  expect(fields.fbp).toBe("fb.1.123.browser");
  const receipt = browser.api.buildAttributionReceipt(attribution, {
    acceptedAt: SECOND, formId: "synthetic-form", formKey: "course-info", leadEventId: "synthetic-event",
  });
  expect(receipt.firstTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(receipt.firstTouch.clickIds.fbp).toBe("fb.1.123.browser");
  expect(receipt.conversionTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(receipt.conversionTouch.clickIds.fbp).toBe("fb.1.123.browser");
});

test("DNT Meta fbclid visit stores no cookie-derived fbc or fbp", () => {
  const browser = browserAttribution({ cookies: META_BROWSER_COOKIES, doNotTrack: "1" });
  const attribution = browser.visit(META, FIRST);
  expect(attribution.consentState).toBe("restricted");
  expectNoCookieMetaIds(attribution, browser.api);
});

test("GPC Meta fbclid visit stores no cookie-derived fbc or fbp", () => {
  const browser = browserAttribution({
    cookies: META_BROWSER_COOKIES,
    globalPrivacyControl: true,
  });
  const attribution = browser.visit(META, FIRST);
  expect(attribution.consentState).toBe("restricted");
  expectNoCookieMetaIds(attribution, browser.api);
});

test("denied attribution consent cookie Meta fbclid visit stores no cookie-derived fbc or fbp", () => {
  const browser = browserAttribution({
    cookies: `${META_BROWSER_COOKIES}; rda_attribution_consent=denied`,
  });
  const attribution = browser.visit(META, FIRST);
  expect(attribution.consentState).toBe("restricted");
  expectNoCookieMetaIds(attribution, browser.api);
});

test("restricted Meta visit keeps URL click IDs and drops only cookie-derived fbc/fbp", () => {
  const browser = browserAttribution({
    cookies: META_BROWSER_COOKIES,
    doNotTrack: "1",
  });
  const attribution = browser.visit(`${META}&fbc=url_fbc&fbp=url_fbp`, FIRST);
  expect(attribution.consentState).toBe("restricted");
  expect(attribution.clickIds.fbclid).toBe("meta_click");
  expect(attribution.clickIds.fbc).toBe("url_fbc");
  expect(attribution.clickIds.fbp).toBe("url_fbp");
  expect(attribution.conversionTouch.clickIds.fbc).toBe("url_fbc");
  expect(attribution.conversionTouch.clickIds.fbp).toBe("url_fbp");
});

test("throwing storage object getters safely retain attribution in memory", () => {
  const browser = browserAttribution({ blockedStorage: true });
  const initial = browser.visit(META, FIRST);
  expect(initial.storageScope).toBe("memory");
  const later = browser.visit("/contact", SECOND);
  expect(later.firstTouch).toEqual(initial.firstTouch);
  expect(later.conversionTouch).toEqual(initial.conversionTouch);
  expect(later.sessionId).toBe(initial.sessionId);
  expect(() => browser.api.getAttributionStorageSnapshot()).not.toThrow();
});

test("creative ad IDs require an exact known prefix followed only by a numeric ID", () => {
  const { api } = browserAttribution();
  for (const content of ["video_sept25_clinical_120000222", "photo_sept18_graduation_120000333", "static_photo_120000444"]) {
    expect(api.parseMetaAdIdFromUtmContent(content)).toBe(content.split("_").at(-1));
  }
  for (const content of ["unrecognized_120000222", "video_sept25_clinical_extra_120000222", "photo_sept18_graduation_120000333_suffix", "video_sept25_clinical_1234", "static_photo_extra_120000222"]) {
    expect(api.parseMetaAdIdFromUtmContent(content)).toBe("");
  }
});
