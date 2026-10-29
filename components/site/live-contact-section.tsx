"use client";

import { useId, useState } from "react";
import {
  ArrowUpRight,
  Clock3,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquareText,
  Navigation,
  Phone,
  Send,
  UserRound,
} from "lucide-react";

import { FloatField, HowHeardField, validateFormControls } from "@/components/academy/form-kit";
import { LeadFormError, LeadFormSuccess } from "@/components/site/lead-form-status";
import { LeadAttributionHiddenFields } from "@/components/site/lead-attribution-fields";
import {
  useLeadAttribution,
  useLeadFormSubmit,
} from "@/components/site/use-lead-form";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { siteContact, whatsAppUrl } from "@/lib/site-data";

const directionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=1271%20Pleasant%20Grove%20Boulevard%2C%20Roseville%2C%20CA%2095747";

export function LiveContactSection({ compact = false }: { compact?: boolean }) {
  const formId = useId();
  // The full /contact page shows the form straight away; the compact homepage
  // block keeps it one tap away so the map and hours stay scannable.
  const [formOpen, setFormOpen] = useState(!compact);
  // Same for the map: the embed pulls ~0.5MB of Google Maps code, so the
  // compact block loads it on tap. /contact shows it straight away.
  const [mapOpen, setMapOpen] = useState(!compact);
  const [updates, setUpdates] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [howHeardComplete, setHowHeardComplete] = useState(false);
  const attribution = useLeadAttribution();
  const { resetLeadForm, status, submitLeadForm } = useLeadFormSubmit();
  const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "production";
  const phoneHref = `tel:${siteContact.phone.replace(/\D/g, "")}`;

  return (
    <section
      aria-labelledby={`${formId}-title`}
      className={compact ? "rda-contact-section ac-contact ac-contact-compact" : "rda-contact-section ac-contact"}
      id="contact"
    >
      <div className="ac-container">
        <div className="ac-heading rda-section-heading" data-reveal="">
          <p className="ac-eyebrow">Visit or reach out</p>
          <h2 className="ac-h2" id={`${formId}-title`}>
            Contact Us
          </h2>
          <span aria-hidden="true" />
        </div>

        <div className="ac-contact-grid">
          <div className="ac-contact-info ac-card" data-reveal="">
            <h3 className="ac-h3">Better yet, come see us in person!</h3>
            <p className="ac-body">We love our students, so feel free to visit during normal business hours.</p>
            <ul className="ac-contact-list">
              <li>
                <span className="ac-icon-tile">
                  <MapPin aria-hidden="true" />
                </span>
                <span>
                  <strong>{siteContact.school}</strong>
                  <span>
                    Located in {siteContact.location} · {siteContact.address}
                  </span>
                </span>
              </li>
              <li>
                <span className="ac-icon-tile">
                  <Phone aria-hidden="true" />
                </span>
                <span>
                  <strong>Call admissions</strong>
                  <a data-rda-lead-source="phone" href={phoneHref}>
                    {siteContact.phone}
                  </a>
                </span>
              </li>
              <li>
                <span className="ac-icon-tile">
                  <Mail aria-hidden="true" />
                </span>
                <span>
                  <strong>Email</strong>
                  <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
                </span>
              </li>
            </ul>
            <div className="rda-hours-list ac-hours">
              <p className="ac-hours-title">
                <Clock3 aria-hidden="true" />
                {siteContact.hoursLabel}
              </p>
              <dl>
                {siteContact.weeklyHours.map((entry) => (
                  <div key={entry.day}>
                    <dt>{entry.day}</dt>
                    <dd>{entry.time}</dd>
                  </div>
                ))}
              </dl>
              <p className="ac-hours-note">{siteContact.hoursNote}</p>
            </div>
            <div className="ac-contact-actions">
              {compact ? (
                <button
                  aria-controls={`${formId}-form`}
                  aria-expanded={formOpen}
                  className="ac-btn ac-btn-primary"
                  data-rda-contact-form-toggle="true"
                  onClick={() => setFormOpen((value) => !value)}
                  type="button"
                >
                  <MessageSquareText aria-hidden="true" />
                  Drop us a line!
                </button>
              ) : null}
              <a className="ac-btn ac-btn-secondary" href={directionsUrl} rel="noreferrer" target="_blank">
                <Navigation aria-hidden="true" />
                Get directions
              </a>
              <a
                aria-label={siteContact.whatsAppLabel}
                className="ac-btn ac-btn-whatsapp"
                data-rda-lead-source="whatsapp"
                data-rda-whatsapp="true"
                href={whatsAppUrl}
                rel="noreferrer"
                target="_blank"
              >
                <WhatsAppIcon />
                <span>{siteContact.whatsAppLabel}</span>
              </a>
            </div>
          </div>

          <div
            aria-label="Roseville Dental Academy Google Maps location"
            className="ac-contact-map rda-contact-map-card"
            data-reveal="zoom"
            role="region"
          >
            {mapOpen ? (
              <iframe
                allowFullScreen
                data-rda-google-map="true"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={siteContact.mapsEmbedUrl}
                title="Google Maps location for Roseville Dental Academy"
              />
            ) : (
              <div className="ac-map-placeholder">
                <MapPin aria-hidden="true" />
                <p>{siteContact.address}</p>
                <button
                  className="ac-btn ac-btn-secondary ac-btn-sm"
                  data-rda-map-load="true"
                  onClick={() => setMapOpen(true)}
                  type="button"
                >
                  Show map
                </button>
              </div>
            )}
            <a className="ac-map-chip" href={siteContact.directionsUrl} rel="noreferrer" target="_blank">
              <MapPin aria-hidden="true" />
              {siteContact.location}, Roseville
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>

          <div
            className="ac-contact-form ac-form-card"
            data-aid="CONTACT_FORM_CONTAINER_REND"
            hidden={!formOpen}
            id={`${formId}-form`}
          >
            {status === "success" ? (
              <div className="ac-contact-success">
                <LeadFormSuccess
                  copy="Your message is on its way. The academy team reads every note and will reply at the email you provided."
                  title="Message sent"
                />
                <button
                  className="ac-btn ac-btn-secondary"
                  onClick={() => {
                    resetLeadForm();
                    setAttempted(false);
                    setHowHeardComplete(false);
                    if (compact) setFormOpen(false);
                  }}
                  type="button"
                >
                  {compact ? "Close" : "Send another message"}
                </button>
              </div>
            ) : (
              <form
                action={siteContact.formspreeEndpoint}
                className="ac-form"
                data-rda-contact-form="true"
                method="post"
                noValidate
                onSubmit={(event) => {
                  setAttempted(true);

                  if (!validateFormControls(event.currentTarget)) {
                    event.preventDefault();
                    return;
                  }

                  // Synthetic submits (QA event dispatches) keep the native form
                  // behavior; only trusted user submits use the inline AJAX flow.
                  if (!event.nativeEvent.isTrusted) {
                    return;
                  }

                  event.preventDefault();
                  void submitLeadForm(event.currentTarget);
                }}
              >
                <div className="ac-contact-form-head">
                  <h3 className="ac-h3">Send us a message</h3>
                  <p className="ac-body">Questions about classes, schedules, or requirements — we&apos;ll reply by email.</p>
                </div>
                {updates ? <input name="updates" type="hidden" value="yes" /> : null}
                <input name="site" type="hidden" value={siteContact.formspreeOps.site} />
                <input name="form_key" type="hidden" value={siteContact.formspreeOps.formKey} />
                <input name="environment" type="hidden" value={environment} />
                <input name={siteContact.formspreeOps.qaField} type="hidden" value="false" />
                <input name="page_path" type="hidden" value="/#contact" />
                <input name="referrer" type="hidden" value={attribution.referrer} />
                <LeadAttributionHiddenFields attribution={attribution} includeLandingContext />
                <div className="ac-field-grid">
                  <FloatField
                    autoComplete="name"
                    icon={UserRound}
                    id={`${formId}-name`}
                    label="Name"
                    name="name"
                    required
                    type="text"
                  />
                  <FloatField
                    autoComplete="email"
                    icon={Mail}
                    id={`${formId}-email`}
                    inputMode="email"
                    label="Email"
                    name="_replyto"
                    required
                    type="email"
                  />
                  <FloatField
                    className="ac-span-2"
                    icon={MessageSquareText}
                    id={`${formId}-message`}
                    label="Message"
                    multiline
                    name="message"
                    required
                    rows={4}
                  />
                </div>
                <HowHeardField
                  invalid={attempted && !howHeardComplete}
                  onAnswer={(_, complete) => setHowHeardComplete(complete)}
                />
                <label className="ac-check" htmlFor={`${formId}-updates`}>
                  <input
                    checked={updates}
                    id={`${formId}-updates`}
                    onChange={(event) => setUpdates(event.currentTarget.checked)}
                    type="checkbox"
                  />
                  <span aria-hidden="true" className="ac-check-box" />
                  <span>Sign up for our email list for updates, promotions, and more.</span>
                </label>
                {status === "error" ? <LeadFormError /> : null}
                <div className="ac-form-footer">
                  <p className="rda-form-note">
                    This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of
                    Service apply.
                  </p>
                  <div className="ac-form-buttons">
                    {compact ? (
                      <button className="ac-btn ac-btn-ghost" onClick={() => setFormOpen(false)} type="button">
                        Cancel
                      </button>
                    ) : null}
                    <button
                      className="ac-btn ac-btn-primary ac-submit"
                      disabled={status === "submitting"}
                      type="submit"
                    >
                      Send
                      {status === "submitting" ? (
                        <LoaderCircle aria-hidden="true" className="ac-spin" />
                      ) : (
                        <Send aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
