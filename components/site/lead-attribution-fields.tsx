"use client";

import { AD_CLICK_ID_FIELDS, UTM_FIELDS } from "@/components/site/use-lead-form";
import {
  getLeadAttributionStamp,
  type LeadAttribution,
} from "@/lib/lead-attribution";
import { CONTACT_CHANNEL_SOURCE } from "@/lib/site-data";

type LeadAttributionHiddenFieldsProps = {
  attribution: LeadAttribution;
  includeLandingContext?: boolean;
};

export function LeadAttributionHiddenFields({
  attribution,
  includeLandingContext = false,
}: LeadAttributionHiddenFieldsProps) {
  const stamp = getLeadAttributionStamp(attribution);
  const channel = CONTACT_CHANNEL_SOURCE.website;

  return (
    <>
      {UTM_FIELDS.map((field) => (
        <input key={field} name={field} type="hidden" value={stamp.utm[field]} />
      ))}
      {AD_CLICK_ID_FIELDS.map((field) => (
        <input key={field} name={field} type="hidden" value={stamp.clickIds[field]} />
      ))}
      <input name="ad_id" type="hidden" value={stamp.ad_id} />
      <input name="campaign_id" type="hidden" value={stamp.campaign_id} />
      <input name="how-heard" type="hidden" value={channel.howHeard} />
      <input name="lead_source" type="hidden" value={channel.leadSource} />
      {includeLandingContext ? (
        <>
          <input name="landing_page" type="hidden" value={stamp.landing_page} />
          <input name="campaign_intent" type="hidden" value={stamp.campaign_intent} />
        </>
      ) : null}
    </>
  );
}
