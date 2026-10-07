export const DEFAULT_META_PIXEL_ID = "356932321507746";
export const META_PIXEL_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

export function getMetaPixelId() {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || DEFAULT_META_PIXEL_ID;
}

export function getMetaSecondaryPixelId(primaryId = getMetaPixelId()) {
  const secondary = process.env.NEXT_PUBLIC_META_SECONDARY_PIXEL_ID?.trim() || "";
  if (!secondary || secondary === primaryId) {
    return "";
  }
  return secondary;
}

export function getMetaBrowserPixelIds() {
  const primary = getMetaPixelId();
  const secondary = getMetaSecondaryPixelId(primary);
  return secondary ? [primary, secondary] : [primary];
}

export function getMetaPixelBootstrapCode(
  pixelId = getMetaPixelId(),
  secondaryPixelId = getMetaSecondaryPixelId(pixelId),
) {
  const pageViewCommands = secondaryPixelId
    ? `fbq('init', ${JSON.stringify(secondaryPixelId)});
    fbq('trackSingle', ${JSON.stringify(pixelId)}, 'PageView');
    fbq('trackSingle', ${JSON.stringify(secondaryPixelId)}, 'PageView');`
    : `fbq('track', 'PageView');`;

  return `
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

    fbq('init', ${JSON.stringify(pixelId)});
    ${pageViewCommands}
    }
  `.trim();
}

const META_CONSENT_COOKIE_NAMES: readonly string[] = [
  "rda_attribution_consent", "rda_analytics_consent", "rda_cookie_consent",
];
const META_DENIED_CONSENT_VALUES: readonly string[] = ["denied", "rejected", "false", "0"];

export function metaMeasurementAllowed() {
  if (typeof window === "undefined") return false;
  const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (privacyNavigator.globalPrivacyControl === true || navigator.doNotTrack === "1" ||
    (window as Window & { doNotTrack?: string }).doNotTrack === "1") return false;

  return !document.cookie.split(";").some((entry) => {
    const separator = entry.indexOf("=");
    const name = entry.slice(0, separator).trim();
    if (!META_CONSENT_COOKIE_NAMES.includes(name)) return false;
    let value = entry.slice(separator + 1);
    try { value = decodeURIComponent(value); } catch { /* Compare malformed cookie data as-is. */ }
    return META_DENIED_CONSENT_VALUES.includes(value.trim().toLowerCase());
  });
}

export function getMetaMeasurementAllowedCode() {
  // Emit explicit browser code. Serializing a server-compiled function would
  // retain Next's constant-folded typeof-window guard and block every visitor.
  return `(function () {
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1") return false;
    var names = ${JSON.stringify(META_CONSENT_COOKIE_NAMES)};
    var denied = ${JSON.stringify(META_DENIED_CONSENT_VALUES)};
    return !document.cookie.split(";").some(function (entry) {
      var separator = entry.indexOf("=");
      var name = entry.slice(0, separator).trim();
      if (names.indexOf(name) < 0) return false;
      var value = entry.slice(separator + 1);
      try { value = decodeURIComponent(value); } catch (_) {}
      return denied.indexOf(value.trim().toLowerCase()) >= 0;
    });
  })()`;
}
