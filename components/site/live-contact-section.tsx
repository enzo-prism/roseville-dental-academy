"use client";

import { useState } from "react";

import { siteContact } from "@/lib/site-data";

const directionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=1271%20Pleasant%20Grove%20Boulevard%2C%20Roseville%2C%20CA%2095747";

export function LiveContactSection({ compact = false }: { compact?: boolean }) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <section className={compact ? "rda-contact-section rda-contact-section-compact" : "rda-contact-section"}>
      <div className="rda-section-heading">
        <h2>Contact Us</h2>
        <span aria-hidden="true" />
      </div>
      <div className="rda-contact-grid">
        <div className="rda-contact-copy">
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
          <div className="rda-contact-actions">
            <button
              data-rda-contact-form-toggle="true"
              onClick={() => setFormOpen((value) => !value)}
              type="button"
            >
              Drop us a line!
            </button>
            <a href={directionsUrl} rel="noreferrer" target="_blank">
              Get directions
            </a>
          </div>
        </div>
        <div
          className="rda-contact-form-card"
          data-aid="CONTACT_FORM_CONTAINER_REND"
          hidden={!formOpen}
        >
          <form action={siteContact.formspreeEndpoint} data-rda-contact-form="true" method="post">
            <label>
              Name
              <input autoComplete="name" name="name" placeholder="Name" type="text" />
            </label>
            <label>
              Email*
              <input
                aria-label="Email"
                autoComplete="email"
                name="_replyto"
                placeholder="Email*"
                required
                type="email"
              />
            </label>
            <label className="rda-contact-checkbox">
              <input name="updates" type="checkbox" value="yes" />
              <span>Sign up for our email list for updates, promotions, and more.</span>
            </label>
            <textarea aria-label="Message" name="message" placeholder="Message" rows={5} />
            <p className="rda-form-note">
              This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of
              Service apply.
            </p>
            <div className="rda-form-actions">
              <button type="submit">Send</button>
              <button onClick={() => setFormOpen(false)} type="button">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
