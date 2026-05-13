"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { siteContact } from "@/lib/site-data";

const directionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=1271%20Pleasant%20Grove%20Boulevard%2C%20Roseville%2C%20CA%2095747";

export function LiveContactSection({ compact = false }: { compact?: boolean }) {
  const formId = useId();
  const [formOpen, setFormOpen] = useState(false);
  const [updates, setUpdates] = useState(false);
  const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "production";

  return (
    <section className={compact ? "rda-contact-section rda-contact-section-compact" : "rda-contact-section"}>
      <div className="rda-section-heading">
        <h2>Contact Us</h2>
        <span aria-hidden="true" />
      </div>
      <div className="rda-contact-grid">
        <Card className="rda-contact-copy border-border bg-card">
          <CardContent>
            <h3>Better yet, come see us in person!</h3>
            <p>We love our students, so feel free to visit during normal business hours.</p>
            <address>
              <strong>{siteContact.school}</strong>
              <br />
              Located in {siteContact.location}
              <br />
              {siteContact.address}
              <br />
              <a href={`tel:${siteContact.phone.replace(/\D/g, "")}`}>Phone: {siteContact.phone}</a>
              <br />
              <a href={`mailto:${siteContact.email}`}>Email: {siteContact.email}</a>
            </address>
            <div className="rda-hours-list">
              <strong>Hours</strong>
              <dl>
                {siteContact.weeklyHours.map((entry) => (
                  <div key={entry.day}>
                    <dt>{entry.day}</dt>
                    <dd>{entry.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rda-contact-actions" data-slot="button-group">
              <Button
                data-rda-contact-form-toggle="true"
                onClick={() => setFormOpen((value) => !value)}
                type="button"
              >
                Drop us a line!
              </Button>
              <Button asChild variant="outline">
                <a href={directionsUrl} rel="noreferrer" target="_blank">
                  Get directions
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
        {!compact ? (
          <Card
            aria-label="Roseville Dental Academy Google Maps location"
            className="rda-contact-map-card border-border bg-card"
          >
            <CardContent className="rda-contact-map-content">
              <iframe
                allowFullScreen
                data-rda-google-map="true"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={siteContact.mapsEmbedUrl}
                title="Google Maps location for Roseville Dental Academy"
              />
            </CardContent>
          </Card>
        ) : null}
        <Card
          className="rda-contact-form-card border-border bg-card"
          data-aid="CONTACT_FORM_CONTAINER_REND"
          hidden={!formOpen}
        >
          <CardContent>
            <form action={siteContact.formspreeEndpoint} data-rda-contact-form="true" method="post">
              {updates ? <input name="updates" type="hidden" value="yes" /> : null}
              <input name="site" type="hidden" value={siteContact.formspreeOps.site} />
              <input name="form_key" type="hidden" value={siteContact.formspreeOps.formKey} />
              <input name="environment" type="hidden" value={environment} />
              <input name={siteContact.formspreeOps.qaField} type="hidden" value="false" />
              <input name="page_path" type="hidden" value="/#contact" />
              <input name="referrer" type="hidden" value="" />
              <input name="utm_source" type="hidden" value="" />
              <input name="utm_medium" type="hidden" value="" />
              <input name="utm_campaign" type="hidden" value="" />
              <input name="utm_term" type="hidden" value="" />
              <input name="utm_content" type="hidden" value="" />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                  <Input autoComplete="name" id={`${formId}-name`} name="name" placeholder="Name" type="text" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${formId}-email`}>Email*</FieldLabel>
                  <Input
                    aria-label="Email"
                    autoComplete="email"
                    id={`${formId}-email`}
                    name="_replyto"
                    placeholder="Email*"
                    required
                    type="email"
                  />
                </Field>
                <Field className="rda-contact-checkbox" orientation="horizontal">
                  <Checkbox checked={updates} onCheckedChange={(checked) => setUpdates(checked === true)} />
                  <FieldContent>
                    <FieldLabel>Sign up for our email list for updates, promotions, and more.</FieldLabel>
                  </FieldContent>
                </Field>
                <Field>
                  <Textarea aria-label="Message" name="message" placeholder="Message" rows={5} />
                </Field>
              </FieldGroup>
              <p className="rda-form-note">
                This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of
                Service apply.
              </p>
              <div className="rda-form-actions" data-slot="button-group">
                <Button type="submit">Send</Button>
                <Button onClick={() => setFormOpen(false)} type="button" variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
