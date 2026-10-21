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
  consent?: "granted" | "denied";
  cookies?: string;
  dnt?: string;
  gpc?: boolean;
  local?: Map<string, string>;
  session?: Map<string, string>;
} = {}) {
  const cookies = new Map<string, string>();
  const local = options.local ?? new Map<string, string>();
  const session = options.session ?? new Map<string, string>();
  const consentCookie =
    options.consent === "granted"
      ? "rda_attribution_consent=granted"
      : options.consent === "denied"
        ? "rda_attribution_consent=denied"
        : "";
  for (const cookie of [options.cookies, consentCookie].filter(Boolean).join(";").split(";")) {
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
      const attributes = value.split(";").slice(1).map((part) => part.trim().toLowerCase());
      const [name, ...parts] = value.split(";", 1)[0].split("=");
      if (!name) return;
      if (attributes.some((part) => part === "max-age=0")) {
        cookies.delete(name);
        return;
      }
      cookies.set(name, parts.join("="));
    },
  };
  const window = { location: new URL("https://rosevilledentalacademy.com/") };
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
      doNotTrack: options.dnt ?? "0",
      ...(options.gpc === true ? { globalPrivacyControl: true } : {}),
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
    document,
    local,
    session,
    visit(path: string, capturedAt: string, referrer = ""): LeadAttribution {
      document.referrer = referrer;
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
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.fbclid).toBe("meta_click");
  expect(stamp.ad_id).toBe("120000222");
  expect(stamp.first_touch_utm_source).toBe("google");
  expect(stamp.conversion_touch_utm_source).toBe("facebook");
  expect(stamp.conversion_touch_ad_id).toBe("120000222");
});

test("Meta then Google does not inherit an earlier Meta click or fbc cookie", () => {
  const browser = browserAttribution({ consent: "granted" });
  const initial = browser.visit(META, FIRST);
  browser.cookies.set("_fbc", "fb.1.123.meta_click");
  browser.cookies.set("_fbp", "fb.1.123.browser");
  const later = browser.visit(GOOGLE, SECOND);
  expect(later.firstTouch.touchId).toBe(initial.firstTouch.touchId);
  expect(later.firstTouch.utm).toEqual(initial.firstTouch.utm);
  expect(later.firstTouch.clickIds.fbclid).toBe("meta_click");
  expect(later.firstTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(later.firstTouch.clickIds.fbp).toBe("fb.1.123.browser");
  expect(later.conversionTouch.clickIds.gclid).toBe("google_click");
  expect(later.conversionTouch.clickIds.fbclid).toBe("");
  expect(later.conversionTouch.clickIds.fbc).toBe("");
  expect(later.conversionTouch.clickIds.fbp).toBe("");
  expect(later.conversionTouch.dimensions.ad_id).toBe("");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("google");
  expect(stamp.gclid).toBe("google_click");
  expect(stamp.fbclid).toBe("");
  expect(stamp.ad_id).toBe("");
  expect(stamp.first_touch_utm_source).toBe("facebook");
  expect(stamp.first_touch_ad_id).toBe("120000222");
});

test("a second click on the same platform gets its own touch instead of filling first-touch gaps", () => {
  const browser = browserAttribution({ consent: "granted" });
  const initial = browser.visit(META, FIRST);
  browser.cookies.set("_fbc", "fb.1.123.meta_click");
  const later = browser.visit(META.replace("meta_click", "different_click"), SECOND);
  expect(later.firstTouch.touchId).toBe(initial.firstTouch.touchId);
  expect(later.firstTouch.utm).toEqual(initial.firstTouch.utm);
  expect(later.firstTouch.clickIds.fbclid).toBe("meta_click");
  expect(later.firstTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(later.conversionTouch.clickIds.fbclid).toBe("different_click");
  expect(later.conversionTouch.clickIds.fbc).toBe("");
  expect(later.conversionTouch.touchId).not.toBe(initial.conversionTouch.touchId);
});

test("same-visit late browser IDs fill gaps without replacing touch identity or campaign", () => {
  const browser = browserAttribution({ consent: "granted" });
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

test("a later document load with the same campaign cannot replace the original first-touch campaign", () => {
  const firstBrowser = browserAttribution({ consent: "granted" });
  const initial = firstBrowser.visit(META, FIRST);
  const laterBrowser = browserAttribution({
    consent: "granted",
    local: firstBrowser.local,
    session: firstBrowser.session,
    cookies: "_fbc=fb.1.123.meta_click; _ga=GA1.1.123.456",
  });
  const later = laterBrowser.visit(META, SECOND);
  expect(later.firstTouch.touchId).toBe(initial.firstTouch.touchId);
  expect(later.firstTouch.capturedAt).toBe(FIRST);
  expect(later.firstTouch.utm).toEqual(initial.firstTouch.utm);
  expect(later.firstTouch.clickIds.fbclid).toBe(initial.firstTouch.clickIds.fbclid);
  expect(later.firstTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(later.conversionTouch.touchId).not.toBe(initial.conversionTouch.touchId);
  expect(later.conversionTouch.capturedAt).toBe(SECOND);
  expect(later.conversionTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
});

test("direct navigation retains the paid conversion touch without enriching an earlier page", () => {
  const browser = browserAttribution({ consent: "granted" });
  const initial = browser.visit(META, FIRST);
  browser.cookies.set("_fbc", "fb.1.123.meta_click");
  const later = browser.visit("/contact", SECOND);
  expect(later.firstTouch.touchId).toBe(initial.firstTouch.touchId);
  expect(later.conversionTouch.touchId).toBe(initial.conversionTouch.touchId);
  expect(later.firstTouch.utm).toEqual(initial.firstTouch.utm);
  expect(later.conversionTouch.utm).toEqual(initial.conversionTouch.utm);
  expect(later.firstTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(later.conversionTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
});

test("a referrer-only Instagram first visit does not hide a later Meta click", () => {
  const browser = browserAttribution();
  const initial = browser.visit("/", FIRST, "https://www.instagram.com/");
  expect(initial.firstTouch.referrer).toBe("https://www.instagram.com/");
  expect(initial.firstTouch.utm.utm_source).toBe("");
  const later = browser.visit(META, SECOND);
  expect(later.firstTouch.utm.utm_source).toBe("");
  expect(later.conversionTouch.clickIds.fbclid).toBe("meta_click");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.fbclid).toBe("meta_click");
  expect(stamp.ad_id).toBe("120000222");
  expect(browser.api.getLeadAttributionStamp(later).landing_page).toBe(
    "/lp/dental-assisting-enroll",
  );
  expect(stamp.first_touch_utm_source).toBe("");
  expect(stamp.conversion_touch_utm_source).toBe("facebook");
});

test("a newer paid Meta click wins the top-level stamp over an older test click", () => {
  const browser = browserAttribution();
  const initial = browser.visit("/coronal-polish?fbclid=testcheck123", FIRST);
  expect(initial.firstTouch.pagePath).toBe("/coronal-polish");
  const later = browser.visit(
    "/infection-control?utm_source=meta&utm_medium=paid_social&utm_campaign=ic189_oct17&utm_content=ic189_student_TEST&utm_id=TEST&utm_source_platform=meta_ads&fbclid=TEST_SAMPLE",
    SECOND,
  );
  expect(later.firstTouch.pagePath).toBe("/coronal-polish");
  expect(later.firstTouch.clickIds.fbclid).toBe("testcheck123");
  expect(later.conversionTouch.pagePath).toBe("/infection-control");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("meta");
  expect(stamp.fbclid).toBe("TEST_SAMPLE");
  expect(stamp.first_touch_fbclid).toBe("testcheck123");
  expect(stamp.landing_page).toBe("/infection-control");
  expect(stamp.conversion_landing_page).toBe("/infection-control");
  expect(stamp.conversion_touch_page_path).toBe("/infection-control");
  expect(stamp.first_touch_page_path).toBe("/coronal-polish");
  expect(browser.api.getLeadAttributionStamp(later).landing_page).toBe("/infection-control");
});

test("Meta click then a clean course page still stamps the later form as Meta", () => {
  const browser = browserAttribution();
  browser.visit(META, FIRST);
  const later = browser.visit("/infection-control", SECOND);
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.fbclid).toBe("meta_click");
  expect(stamp.ad_id).toBe("120000222");
  expect(browser.api.getLeadAttributionStamp(later).landing_page).toBe(
    "/lp/dental-assisting-enroll",
  );
});

test("compact stamp cookie and session copy survive a wiped localStorage document", () => {
  const firstBrowser = browserAttribution();
  firstBrowser.visit(META, FIRST);
  expect(firstBrowser.session.get("rda_lead_attribution_session_v2")).toContain("meta_click");
  expect(firstBrowser.cookies.get("rda_lead_attribution_stamp_v1")).toBeTruthy();
  const laterBrowser = browserAttribution({
    cookies: [...firstBrowser.cookies]
      .filter(([name]) => name === "rda_lead_attribution_stamp_v1")
      .map(([name, value]) => `${name}=${value}`)
      .join("; "),
    session: firstBrowser.session,
  });
  const later = laterBrowser.visit("/infection-control", SECOND);
  const stamp = laterBrowser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.fbclid).toBe("meta_click");
  expect(stamp.ad_id).toBe("120000222");
});

test("late Meta browser IDs fill a stored lander after the visitor opens a clean course page", () => {
  const browser = browserAttribution({ consent: "granted" });
  const initial = browser.visit(META, FIRST);
  expect(initial.firstTouch.clickIds.fbp).toBe("");
  browser.cookies.set("_fbc", "fb.1.123.meta_click");
  browser.cookies.set("_fbp", "fb.1.123.browser");
  const later = browser.visit("/infection-control", SECOND);
  expect(later.firstTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(later.firstTouch.clickIds.fbp).toBe("fb.1.123.browser");
  expect(later.firstTouch.utm.utm_source).toBe("facebook");
  expect(later.conversionTouch.clickIds.fbclid).toBe("meta_click");
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

const IC_CAMPAIGNS = [
  { content: "ic189_student_120249085995100567", adId: "120249085995100567" },
  { content: "ic189_cert_120248882486160567", adId: "120248882486160567" },
];
const IC_ADSET = "120249000000000567";
const IC_CAMPAIGN = "120248000000000567";
function infectionControlUrl(content: string) {
  return `/infection-control?utm_source=facebook&utm_medium=paid_social&utm_campaign=ic189_oct17&utm_id=${IC_CAMPAIGN}&utm_term=${IC_ADSET}&utm_content=${content}`;
}

for (const creative of IC_CAMPAIGNS) {
  test(`${creative.content} restores native IDs and retains them on clean navigation`, () => {
    const browser = browserAttribution();
    const initial = browser.visit(infectionControlUrl(creative.content), FIRST);
    expect(initial.firstTouch.dimensions).toMatchObject({
      ad_id: creative.adId, adset_id: IC_ADSET, campaign_id: IC_CAMPAIGN,
    });
    const later = browser.visit("/contact", SECOND);
    expect(later.firstTouch).toEqual(initial.firstTouch);
    expect(later.conversionTouch).toEqual(initial.conversionTouch);
    expect(browser.api.getLeadAttributionFormFields(later)).toMatchObject({
      ad_id: creative.adId, first_touch_adset_id: IC_ADSET,
      conversion_touch_ad_id: creative.adId, conversion_touch_adset_id: IC_ADSET,
    });
  });
}

test("old persisted IC189 touches recover only their own native dimensions", () => {
  const browser = browserAttribution();
  browser.visit(infectionControlUrl(IC_CAMPAIGNS[0].content), FIRST);
  const stored = JSON.parse(browser.local.get("rda_lead_attribution_v2")!);
  stored.firstTouch.dimensions.ad_id = "";
  stored.firstTouch.dimensions.adset_id = "";
  stored.conversionTouch.dimensions.ad_id = "";
  stored.conversionTouch.dimensions.adset_id = "";
  browser.local.set("rda_lead_attribution_v2", JSON.stringify(stored));
  const reloaded = browserAttribution({ local: browser.local, session: browser.session });
  const later = reloaded.visit(infectionControlUrl(IC_CAMPAIGNS[1].content)
    .replace(IC_ADSET, "120249111111111567"), SECOND);
  expect(later.firstTouch.dimensions).toMatchObject({
    ad_id: IC_CAMPAIGNS[0].adId, adset_id: IC_ADSET,
  });
  expect(later.firstTouch.touchId).toBe(stored.firstTouch.touchId);
  expect(later.firstTouch.capturedAt).toBe(FIRST);
  expect(later.conversionTouch.dimensions).toMatchObject({
    ad_id: IC_CAMPAIGNS[1].adId, adset_id: "120249111111111567",
  });
  const stamp = reloaded.api.getLeadAttributionFormFields(later);
  expect(stamp.ad_id).toBe(IC_CAMPAIGNS[1].adId);
  expect(stamp.first_touch_ad_id).toBe(IC_CAMPAIGNS[0].adId);
});

test("explicit conflicting native IDs win over legacy IC189 tags before and after reload", () => {
  const browser = browserAttribution();
  const initial = browser.visit(`${infectionControlUrl(IC_CAMPAIGNS[0].content)}&ad_id=999999999&ad_set_id=888888888&campaign_id=777777777`, FIRST);
  const expected = { ad_id: "999999999", adset_id: "888888888", campaign_id: "777777777" };
  expect(initial.firstTouch.dimensions).toMatchObject(expected);
  const reloaded = browserAttribution({ local: browser.local, session: browser.session });
  const later = reloaded.visit("/contact", SECOND);
  expect(later.firstTouch.dimensions).toMatchObject(expected);
  expect(later.conversionTouch.dimensions).toMatchObject(expected);
});

test("legacy ad-set mapping requires paid Meta context and a recognized numeric creative", () => {
  const { api } = browserAttribution();
  const base = infectionControlUrl(IC_CAMPAIGNS[0].content);
  const parse = (url: string) => api.parseAttributionTouch(new URL(url, "https://example.test").search, "", "https://example.test", "/infection-control");
  for (const source of ["facebook", "instagram", "fb", "ig", "meta", "meta_ads"]) {
    expect(parse(base.replace("utm_source=facebook", `utm_source=${source}`)).dimensions.adset_id).toBe(IC_ADSET);
  }
  expect(parse(base.replace("utm_source=facebook", "utm_source=fb&utm_source_platform=meta_ads")).dimensions.adset_id).toBe(IC_ADSET);
  for (const url of [
    base.replace("facebook", "google"),
    base.replace("paid_social", "organic"),
    base.replace("paid_social", "referral"),
    base.replace(IC_CAMPAIGNS[0].content, "unrecognized_120249085995100567"),
    `${base}&ad_id=999999999`,
    `${base}&ad_id={{ad.id}}`,
    `${base}&platform=google`,
    base.replace("utm_source=facebook", "utm_source=google") + "&fbclid=meta_click",
  ]) {
    expect(parse(url).dimensions.adset_id).toBe("");
  }
  expect(parse(`${base}&ad_id=999999999`).dimensions.ad_id).toBe("999999999");
});

test("malformed IC189 suffixes and unresolved dynamic macros never become inferred IDs", () => {
  const { api } = browserAttribution();
  for (const content of [
    "ic189_student_1234", "ic189_student_123456_suffix", "ic189_cert_extra_123456",
    "ic189_cert_{{ad.id}}", "ic189_student_" + "1".repeat(41), "unknown_123456",
  ]) {
    expect(api.parseMetaAdIdFromUtmContent(content)).toBe("");
    const touch = api.parseAttributionTouch(new URL(infectionControlUrl(content), "https://example.test").search, "", "https://example.test", "/");
    expect(touch.dimensions.ad_id).toBe("");
    expect(touch.dimensions.adset_id).toBe("");
  }
  for (const term of ["{{adset.id}}", "1234", "123456_keyword", "1".repeat(41)]) {
    const query = new URL(infectionControlUrl(IC_CAMPAIGNS[0].content).replace(IC_ADSET, term), "https://example.test").search;
    expect(api.parseAttributionTouch(query, "", "https://example.test", "/").dimensions.adset_id).toBe("");
  }
});

const META_UTM_ONLY =
  "/lp/dental-assisting-enroll?utm_source=facebook&utm_medium=paid_social&utm_campaign=meta_second";
const META_COOKIES = "_fbc=fb.1.123.meta_click; _fbp=fb.1.123.browser";
const GBP = "/contact?utm_source=google&utm_medium=gmb&utm_campaign=roseville";
const ORGANIC_IG = "/contact?utm_source=ig&utm_medium=social";

function expectEmptyBrowserIds(stamp: Record<string, string>) {
  expect(stamp.fbp).toBe("");
  expect(stamp.fbc).toBe("");
  expect(stamp.first_touch_fbp).toBe("");
  expect(stamp.first_touch_fbc).toBe("");
  expect(stamp.conversion_touch_fbp).toBe("");
  expect(stamp.conversion_touch_fbc).toBe("");
}

test("denied consent never sends or persists cookie fbp/fbc, even with a Meta UTM", () => {
  const browser = browserAttribution({ consent: "denied", cookies: META_COOKIES });
  const attribution = browser.visit(META_UTM_ONLY, FIRST);
  expect(attribution.consentState).toBe("restricted");
  expectEmptyBrowserIds(browser.api.getLeadAttributionFormFields(attribution));
  expect(browser.local.size).toBe(0);
  expect(browser.cookies.get("rda_lead_attribution_stamp_v1") ?? "").not.toContain("fb.1.123.browser");
});

test("denied consent with an fbclid still leaves fbp/fbc empty", () => {
  const browser = browserAttribution({ consent: "denied", cookies: META_COOKIES });
  const attribution = browser.visit(META, FIRST);
  expect(attribution.consentState).toBe("restricted");
  const stamp = browser.api.getLeadAttributionFormFields(attribution);
  expect(stamp.fbclid).toBe("meta_click");
  expectEmptyBrowserIds(stamp);
});

test("absent consent does not read _fbp on a Meta UTM visit", () => {
  const browser = browserAttribution({ cookies: META_COOKIES });
  const attribution = browser.visit(META_UTM_ONLY, FIRST);
  expect(attribution.consentState).toBe("unknown");
  expectEmptyBrowserIds(browser.api.getLeadAttributionFormFields(attribution));
});

test("GPC restricts consent and leaves cookie fbp/fbc empty", () => {
  const browser = browserAttribution({ cookies: META_COOKIES, gpc: true });
  const attribution = browser.visit(META, FIRST);
  expect(attribution.consentState).toBe("restricted");
  const stamp = browser.api.getLeadAttributionFormFields(attribution);
  expect(stamp.fbclid).toBe("meta_click");
  expectEmptyBrowserIds(stamp);
});

test("unknown consent does not persist _fbp in the stamp cookie or back-fill stored visits", () => {
  const browser = browserAttribution({ cookies: META_COOKIES });
  const initial = browser.visit(META, FIRST);
  expect(initial.consentState).toBe("unknown");
  expectEmptyBrowserIds(browser.api.getLeadAttributionFormFields(initial));
  const stampCookie = decodeURIComponent(browser.cookies.get("rda_lead_attribution_stamp_v1") ?? "");
  expect(stampCookie).toContain("meta_click");
  expect(stampCookie).not.toContain("fb.1.123.browser");
  expect(stampCookie).not.toMatch(/"fbp"/);
  const stored = JSON.parse(browser.local.get("rda_lead_attribution_v2")!);
  expect(stored.firstTouch.clickIds.fbp).toBe("");
  expect(stored.conversionTouch.clickIds.fbp).toBe("");
  const later = browser.visit("/infection-control", SECOND);
  expectEmptyBrowserIds(browser.api.getLeadAttributionFormFields(later));
});

test("granted consent reads _fbp/_fbc and builds fbc from fbclid when the cookie is missing", () => {
  const browser = browserAttribution({
    consent: "granted",
    cookies: "_fbp=fb.1.123.browser",
  });
  const attribution = browser.visit(META, FIRST);
  expect(attribution.consentState).toBe("granted");
  const stamp = browser.api.getLeadAttributionFormFields(attribution);
  expect(stamp.fbp).toBe("fb.1.123.browser");
  expect(stamp.first_touch_fbp).toBe("fb.1.123.browser");
  expect(stamp.conversion_touch_fbp).toBe("fb.1.123.browser");
  expect(stamp.fbc).toBe(`fb.1.${Date.parse(FIRST)}.meta_click`);
  const stampCookie = decodeURIComponent(browser.cookies.get("rda_lead_attribution_stamp_v1") ?? "");
  expect(stampCookie).toContain("meta_click");
  expect(stampCookie).not.toContain("fb.1.123.browser");
  expect(stampCookie).not.toMatch(/"fbc"|"fbp"|"ttp"/);
});

test("a later GBP visit does not drop a Meta fbclid or ad_id from the top-level stamp", () => {
  const browser = browserAttribution();
  browser.visit(META, FIRST);
  const later = browser.visit(GBP, SECOND);
  expect(later.conversionTouch.utm.utm_source).toBe("google");
  expect(later.conversionTouch.utm.utm_medium).toBe("gmb");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.utm_medium).toBe("paid_social");
  expect(stamp.fbclid).toBe("meta_click");
  expect(stamp.ad_id).toBe("120000222");
  expect(stamp.conversion_touch_utm_source).toBe("google");
  expect(stamp.first_touch_fbclid).toBe("meta_click");
});

test("a later organic ig/social visit does not drop a Meta fbclid or ad_id from the top-level stamp", () => {
  const browser = browserAttribution();
  browser.visit(META, FIRST);
  const later = browser.visit(ORGANIC_IG, SECOND);
  expect(later.conversionTouch.utm.utm_source).toBe("ig");
  expect(later.conversionTouch.utm.utm_medium).toBe("social");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.fbclid).toBe("meta_click");
  expect(stamp.ad_id).toBe("120000222");
  expect(stamp.conversion_touch_utm_source).toBe("ig");
});

test("a later organic ig/social visit with fbclid keeps the Meta ad stamp", () => {
  const browser = browserAttribution();
  browser.visit(META, FIRST);
  const later = browser.visit(`${ORGANIC_IG}&fbclid=organic_ig_fbclid`, SECOND);
  expect(later.conversionTouch.clickIds.fbclid).toBe("organic_ig_fbclid");
  expect(later.conversionTouch.utm.utm_medium).toBe("social");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.utm_medium).toBe("paid_social");
  expect(stamp.utm_campaign).toBe("meta_second");
  expect(stamp.fbclid).toBe("meta_click");
  expect(stamp.ad_id).toBe("120000222");
  expect(stamp.landing_page).toBe("/lp/dental-assisting-enroll");
  expect(stamp.conversion_touch_fbclid).toBe("organic_ig_fbclid");
});

test("a later GBP visit with fbclid keeps the Meta ad stamp", () => {
  const browser = browserAttribution();
  browser.visit(META, FIRST);
  const later = browser.visit(`${GBP}&fbclid=gbp_fbclid`, SECOND);
  expect(later.conversionTouch.clickIds.fbclid).toBe("gbp_fbclid");
  expect(later.conversionTouch.utm.utm_medium).toBe("gmb");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.utm_medium).toBe("paid_social");
  expect(stamp.fbclid).toBe("meta_click");
  expect(stamp.ad_id).toBe("120000222");
  expect(stamp.landing_page).toBe("/lp/dental-assisting-enroll");
});

test("a later organic ig/social visit with fbclid keeps an earlier Google ad", () => {
  const browser = browserAttribution();
  browser.visit(GOOGLE, FIRST);
  const later = browser.visit(`${ORGANIC_IG}&fbclid=organic_ig_after_google`, SECOND);
  expect(later.conversionTouch.utm.utm_source).toBe("ig");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("google");
  expect(stamp.utm_medium).toBe("cpc");
  expect(stamp.utm_campaign).toBe("google_first");
  expect(stamp.gclid).toBe("google_click");
  expect(stamp.fbclid).toBe("");
  expect(stamp.landing_page).toBe("/lp/dental-assisting-enroll");
});

test("a bare fbclid with no medium still counts as paid", () => {
  const browser = browserAttribution();
  const attribution = browser.visit("/infection-control?fbclid=bare_fbclid", FIRST);
  const stamp = browser.api.getLeadAttributionFormFields(attribution);
  expect(stamp.fbclid).toBe("bare_fbclid");
  expect(stamp.utm_medium).toBe("");
  expect(stamp.landing_page).toBe("/infection-control");
});

test("a bare gclid with no medium still counts as paid", () => {
  const browser = browserAttribution();
  const attribution = browser.visit("/infection-control?gclid=bare_gclid", FIRST);
  const stamp = browser.api.getLeadAttributionFormFields(attribution);
  expect(stamp.gclid).toBe("bare_gclid");
  expect(stamp.utm_medium).toBe("");
  expect(stamp.landing_page).toBe("/infection-control");
});

test("Meta ad then Google ad still takes the newer paid touch", () => {
  const browser = browserAttribution();
  browser.visit(META, FIRST);
  const later = browser.visit(GOOGLE, SECOND);
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("google");
  expect(stamp.utm_medium).toBe("cpc");
  expect(stamp.gclid).toBe("google_click");
  expect(stamp.fbclid).toBe("");
  expect(stamp.ad_id).toBe("");
  expect(stamp.first_touch_utm_source).toBe("facebook");
  expect(stamp.first_touch_ad_id).toBe("120000222");
});

test("paid and unpaid utm medium lists stay locked to the documented definition", () => {
  const browser = browserAttribution();
  expect([...browser.api.PAID_UTM_MEDIUMS]).toEqual([
    "cpc",
    "ppc",
    "paid",
    "paid_social",
    "paid-social",
  ]);
  expect([...browser.api.UNPAID_UTM_MEDIUMS]).toEqual([
    "social",
    "organic",
    "gmb",
    "gbp",
    "google_business_profile",
  ]);

  const emptyUtm = Object.fromEntries(
    browser.api.UTM_FIELDS.map((field) => [field, ""]),
  ) as LeadAttribution["utm"];
  const emptyClickIds = Object.fromEntries(
    browser.api.AD_CLICK_ID_FIELDS.map((field) => [field, ""]),
  ) as LeadAttribution["clickIds"];

  for (const medium of browser.api.PAID_UTM_MEDIUMS) {
    expect(
      browser.api.hasPaidTouch({
        clickIds: emptyClickIds,
        utm: { ...emptyUtm, utm_medium: medium },
      }),
      medium,
    ).toBe(true);
  }

  for (const medium of browser.api.UNPAID_UTM_MEDIUMS) {
    expect(
      browser.api.hasPaidTouch({
        clickIds: { ...emptyClickIds, fbclid: "organic_fbclid" },
        utm: { ...emptyUtm, utm_medium: medium },
      }),
      medium,
    ).toBe(false);
  }

  expect(
    browser.api.hasPaidTouch({
      clickIds: { ...emptyClickIds, gclid: "bare_gclid" },
      utm: emptyUtm,
    }),
  ).toBe(true);
  expect(
    browser.api.hasPaidTouch({
      clickIds: { ...emptyClickIds, fbclid: "bare_fbclid" },
      utm: emptyUtm,
    }),
  ).toBe(true);
  expect(browser.api.hasPaidTouch({ clickIds: emptyClickIds, utm: emptyUtm })).toBe(false);
  expect(
    browser.api.hasPaidTouch({
      clickIds: emptyClickIds,
      utm: { ...emptyUtm, utm_medium: "Paid_Social" },
    }),
  ).toBe(true);
  expect(
    browser.api.hasPaidTouch({
      clickIds: emptyClickIds,
      utm: { ...emptyUtm, utm_medium: "CPC" },
    }),
  ).toBe(true);
  expect(
    browser.api.hasPaidTouch({
      clickIds: { ...emptyClickIds, fbclid: "organic_fbclid" },
      utm: { ...emptyUtm, utm_medium: " GMB " },
    }),
  ).toBe(false);
  expect(
    browser.api.hasPaidTouch({
      clickIds: { ...emptyClickIds, fbclid: "organic_fbclid" },
      utm: { ...emptyUtm, utm_medium: " Social " },
    }),
  ).toBe(false);
});

test("Meta ad then a bare gclid-only touch takes the newer paid click", () => {
  const browser = browserAttribution();
  browser.visit(META, FIRST);
  const later = browser.visit("/contact?gclid=newer_gclid_only", SECOND);
  expect(later.conversionTouch.clickIds.gclid).toBe("newer_gclid_only");
  expect(later.conversionTouch.utm.utm_medium).toBe("");
  expect(later.lastPaidTouch.clickIds.gclid).toBe("newer_gclid_only");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.gclid).toBe("newer_gclid_only");
  expect(stamp.utm_source).toBe("");
  expect(stamp.utm_medium).toBe("");
  expect(stamp.fbclid).toBe("");
  expect(stamp.ad_id).toBe("");
  expect(stamp.landing_page).toBe("/contact");
  expect(stamp.first_touch_utm_source).toBe("facebook");
  expect(stamp.first_touch_fbclid).toBe("meta_click");
});

test("Google then Meta then organic Instagram fbclid keeps the Meta paid stamp", () => {
  const browser = browserAttribution();
  const third = "2026-09-29T10:20:00.000Z";
  browser.visit(GOOGLE, FIRST);
  browser.visit(
    "/infection-control?utm_source=meta&utm_medium=paid_social&utm_campaign=ic189_oct17&utm_content=ic189_student_120249085995100567&utm_id=120249084101080567&utm_source_platform=meta_ads&fbclid=meta_ad_click",
    SECOND,
  );
  const later = browser.visit(`${ORGANIC_IG}&fbclid=organic_ig_fbclid`, third);
  expect(later.firstTouch.utm.utm_source).toBe("google");
  expect(later.conversionTouch.utm.utm_medium).toBe("social");
  expect(later.conversionTouch.clickIds.fbclid).toBe("organic_ig_fbclid");
  expect(later.lastPaidTouch.utm.utm_source).toBe("meta");
  expect(later.lastPaidTouch.clickIds.fbclid).toBe("meta_ad_click");
  const stored = JSON.parse(browser.local.get("rda_lead_attribution_v2")!) as {
    lastPaidTouch: { clickIds: { fbclid: string } };
  };
  expect(stored.lastPaidTouch.clickIds.fbclid).toBe("meta_ad_click");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("meta");
  expect(stamp.utm_medium).toBe("paid_social");
  expect(stamp.utm_campaign).toBe("ic189_oct17");
  expect(stamp.fbclid).toBe("meta_ad_click");
  expect(stamp.ad_id).toBe("120249085995100567");
  expect(stamp.landing_page).toBe("/infection-control");
  expect(stamp.conversion_touch_fbclid).toBe("organic_ig_fbclid");
  expect(stamp.first_touch_utm_source).toBe("google");
});

const META_IC =
  "/infection-control?utm_source=meta&utm_medium=paid_social&utm_campaign=ic189_oct17&utm_content=ic189_student_120249085995100567&utm_id=120249084101080567&utm_source_platform=meta_ads&fbclid=meta_ad_click";
const ORGANIC_IG_HOME = "/?utm_source=ig&utm_medium=social&fbclid=organic_ig_fbclid";
const THIRD = "2026-09-29T10:20:00.000Z";
const FOURTH = "2026-09-30T10:00:00.000Z";

function cookieHeader(
  source: ReturnType<typeof browserAttribution>,
  names?: string[],
) {
  return [...source.cookies]
    .filter(([name]) => !names || names.includes(name))
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function encodedFullCookieLength(source: ReturnType<typeof browserAttribution>) {
  return (source.cookies.get("rda_lead_attribution_v2") ?? "").length;
}

test("cookie-only restore after Meta then organic Instagram keeps the IG conversion", () => {
  const firstBrowser = browserAttribution();
  firstBrowser.visit(META_IC, FIRST);
  const afterIg = firstBrowser.visit(ORGANIC_IG_HOME, SECOND);
  expect(afterIg.conversionTouch.utm.utm_source).toBe("ig");
  expect(afterIg.conversionTouch.pagePath).toBe("/");
  expect(afterIg.lastPaidTouch.utm.utm_source).toBe("meta");
  const metaThenIgCookieLength = encodedFullCookieLength(firstBrowser);
  expect(
    metaThenIgCookieLength,
    `M→IG full cookie ${metaThenIgCookieLength}B`,
  ).toBeGreaterThan(0);
  expect(metaThenIgCookieLength).toBeLessThan(firstBrowser.api.MAX_COOKIE_LENGTH);
  const stored = JSON.parse(decodeURIComponent(
    firstBrowser.cookies.get("rda_lead_attribution_v2")!,
  )) as { lastPaidTouch?: unknown };
  expect(stored.lastPaidTouch).toBeUndefined();

  const laterBrowser = browserAttribution({ cookies: cookieHeader(firstBrowser) });
  const later = laterBrowser.visit("/contact", THIRD);
  expect(later.firstTouch.utm.utm_source).toBe("meta");
  expect(later.conversionTouch.utm.utm_source).toBe("ig");
  expect(later.conversionTouch.pagePath).toBe("/");
  expect(later.lastPaidTouch.utm.utm_source).toBe("meta");
  const stamp = laterBrowser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("meta");
  expect(stamp.fbclid).toBe("meta_ad_click");
  expect(stamp.conversion_touch_utm_source).toBe("ig");
  expect(stamp.conversion_landing_page).toBe("/");
  expect(stamp.landing_page).toBe("/infection-control");
});

test("cookie-only restore after Google then Meta then organic Instagram keeps Meta last-paid", () => {
  const firstBrowser = browserAttribution();
  firstBrowser.visit(GOOGLE, FIRST);
  firstBrowser.visit(META_IC, SECOND);
  const afterIg = firstBrowser.visit(ORGANIC_IG_HOME, THIRD);
  expect(afterIg.firstTouch.utm.utm_source).toBe("google");
  expect(afterIg.conversionTouch.utm.utm_source).toBe("ig");
  expect(afterIg.lastPaidTouch.utm.utm_source).toBe("meta");
  const encodedLength = encodedFullCookieLength(firstBrowser);
  expect(encodedLength, `G→M→IG full cookie ${encodedLength}B`).toBeGreaterThan(0);
  expect(
    encodedLength,
    `G→M→IG full cookie ${encodedLength}B must stay under ${firstBrowser.api.MAX_COOKIE_LENGTH}`,
  ).toBeLessThan(firstBrowser.api.MAX_COOKIE_LENGTH);
  const stored = JSON.parse(decodeURIComponent(
    firstBrowser.cookies.get("rda_lead_attribution_v2")!,
  )) as { lastPaidTouch?: { utm?: { utm_source?: string } } };
  expect(stored.lastPaidTouch?.utm?.utm_source).toBe("meta");

  const laterBrowser = browserAttribution({ cookies: cookieHeader(firstBrowser) });
  const later = laterBrowser.visit("/contact", FOURTH);
  expect(later.firstTouch.utm.utm_source).toBe("google");
  expect(later.conversionTouch.utm.utm_source).toBe("ig");
  expect(later.conversionTouch.pagePath).toBe("/");
  expect(later.lastPaidTouch.utm.utm_source).toBe("meta");
  const stamp = laterBrowser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("meta");
  expect(stamp.fbclid).toBe("meta_ad_click");
  expect(stamp.conversion_touch_utm_source).toBe("ig");
  expect(stamp.conversion_landing_page).toBe("/");
  expect(stamp.landing_page).toBe("/infection-control");
  expect(stamp.first_touch_utm_source).toBe("google");
});

test("compact stamp p cookie restores last-paid Meta when the full cookie is gone", () => {
  const firstBrowser = browserAttribution();
  firstBrowser.visit(GOOGLE, FIRST);
  firstBrowser.visit(META_IC, SECOND);
  firstBrowser.visit(ORGANIC_IG_HOME, THIRD);
  const stampRaw = decodeURIComponent(
    firstBrowser.cookies.get("rda_lead_attribution_stamp_v1") ?? "",
  );
  expect(stampRaw).toMatch(/"p":\{/);
  expect(stampRaw).toContain("meta_ad_click");

  const laterBrowser = browserAttribution({
    cookies: cookieHeader(firstBrowser, ["rda_lead_attribution_stamp_v1"]),
  });
  expect(laterBrowser.cookies.get("rda_lead_attribution_v2")).toBeUndefined();
  const later = laterBrowser.visit("/contact", FOURTH);
  expect(later.firstTouch.utm.utm_source).toBe("google");
  expect(later.conversionTouch.utm.utm_source).toBe("ig");
  expect(later.lastPaidTouch.utm.utm_source).toBe("meta");
  const stamp = laterBrowser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("meta");
  expect(stamp.fbclid).toBe("meta_ad_click");
  expect(stamp.landing_page).toBe("/infection-control");
  expect(stamp.conversion_touch_utm_source).toBe("ig");
  expect(stamp.conversion_landing_page).toBe("/");
});

test("an oversized full-cookie write expires the stale v2 cookie so the stamp wins", () => {
  const firstBrowser = browserAttribution();
  firstBrowser.visit(GOOGLE, FIRST);
  firstBrowser.visit(META_IC, SECOND);
  expect(firstBrowser.cookies.get("rda_lead_attribution_v2")).toBeTruthy();
  const long = "w".repeat(512);
  firstBrowser.visit(
    `/?utm_source=ig&utm_medium=social&utm_campaign=${long}&utm_content=${long}&utm_term=${long}&fbclid=organic_${long}`,
    THIRD,
  );
  expect(firstBrowser.cookies.get("rda_lead_attribution_v2")).toBeUndefined();
  const stampRaw = decodeURIComponent(
    firstBrowser.cookies.get("rda_lead_attribution_stamp_v1") ?? "",
  );
  expect(stampRaw).toMatch(/"p":\{/);

  const laterBrowser = browserAttribution({
    cookies: cookieHeader(firstBrowser, ["rda_lead_attribution_stamp_v1"]),
  });
  const later = laterBrowser.visit("/contact", FOURTH);
  expect(later.conversionTouch.utm.utm_source).toBe("ig");
  expect(later.lastPaidTouch.utm.utm_source).toBe("meta");
  const stamp = laterBrowser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("meta");
  expect(stamp.conversion_touch_utm_source).toBe("ig");
});

test("a malformed lastPaidTouch in localStorage is ignored and derived", () => {
  const browser = browserAttribution();
  browser.visit(GOOGLE, FIRST);
  const stored = JSON.parse(browser.local.get("rda_lead_attribution_v2")!) as {
    lastPaidTouch: unknown;
  };
  stored.lastPaidTouch = {
    capturedAt: 5,
    clickIds: { fbclid: 5 },
    dimensions: { ad_id: 5 },
    utm: { utm_medium: 5, utm_source: "meta" },
  };
  browser.local.set("rda_lead_attribution_v2", JSON.stringify(stored));
  const later = browser.visit(ORGANIC_IG_HOME, SECOND);
  expect(later.firstTouch.utm.utm_source).toBe("google");
  expect(later.conversionTouch.utm.utm_source).toBe("ig");
  expect(later.lastPaidTouch.utm.utm_source).toBe("google");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("google");
  expect(stamp.gclid).toBe("google_click");
  expect(stamp.first_touch_utm_source).toBe("google");
});

test("withdrawn consent does not send lastPaid Meta fbc/fbp at the top level", () => {
  const browser = browserAttribution({ consent: "granted", cookies: META_COOKIES });
  browser.visit(GOOGLE, FIRST);
  browser.visit(META, SECOND);
  browser.visit(`${ORGANIC_IG}&fbclid=organic_ig_fbclid`, THIRD);
  const granted = browser.api.getLeadAttributionFormFields(
    browser.api.resolveLeadAttribution({ capturedAt: THIRD }, false),
  );
  expect(granted.fbc).toBe("fb.1.123.meta_click");
  expect(granted.fbp).toBe("fb.1.123.browser");
  browser.cookies.set("rda_attribution_consent", "denied");
  const later = browser.visit("/contact", FOURTH);
  expect(later.consentState).toBe("restricted");
  expect(later.lastPaidTouch.utm.utm_source).toBe("facebook");
  expect(later.lastPaidTouch.clickIds.fbc).toBe("");
  expect(later.lastPaidTouch.clickIds.fbp).toBe("");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.fbclid).toBe("meta_click");
  expect(stamp.fbc).toBe("");
  expect(stamp.fbp).toBe("");
});

test("granted consent back-fills lastPaid Meta browser IDs from late cookies", () => {
  const browser = browserAttribution({ consent: "granted" });
  browser.visit(GOOGLE, FIRST);
  const meta = browser.visit(META, SECOND);
  expect(meta.lastPaidTouch.clickIds.fbp).toBe("");
  browser.cookies.set("_fbc", "fb.1.123.meta_click");
  browser.cookies.set("_fbp", "fb.1.123.browser");
  const later = browser.visit("/infection-control", THIRD);
  expect(later.lastPaidTouch.utm.utm_source).toBe("facebook");
  expect(later.lastPaidTouch.clickIds.fbc).toBe("fb.1.123.meta_click");
  expect(later.lastPaidTouch.clickIds.fbp).toBe("fb.1.123.browser");
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.fbc).toBe("fb.1.123.meta_click");
  expect(stamp.fbp).toBe("fb.1.123.browser");
});

test("Paid_Social medium is paid and a padded GMB medium stays unpaid", () => {
  const browser = browserAttribution();
  const paid = browser.visit(
    "/?utm_source=facebook&utm_medium=Paid_Social&utm_campaign=case&fbclid=case_click",
    FIRST,
  );
  expect(browser.api.hasPaidTouch(paid.conversionTouch)).toBe(true);
  expect(browser.api.getLeadAttributionFormFields(paid).utm_medium).toBe("Paid_Social");
  const later = browser.visit(
    "/contact?utm_source=google&utm_medium=%20GMB%20&utm_campaign=gbp&fbclid=gbp_click",
    SECOND,
  );
  expect(later.conversionTouch.utm.utm_medium).toBe("GMB");
  expect(browser.api.hasPaidTouch(later.conversionTouch)).toBe(false);
  const stamp = browser.api.getLeadAttributionFormFields(later);
  expect(stamp.utm_source).toBe("facebook");
  expect(stamp.utm_medium).toBe("Paid_Social");
  expect(stamp.fbclid).toBe("case_click");
});
