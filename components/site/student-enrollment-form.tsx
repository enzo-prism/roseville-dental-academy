"use client";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { trackEnrollFunnel } from "@/components/site/enroll-funnel-analytics";
import { enrollOrderParams } from "@/lib/enroll-funnel-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type Offering = {
  id: string;
  course_date: string;
  label?: string;
  price: string;
  amount: number;
  remaining: number;
};
const STORAGE = "rda-student-checkout";
function subscribe(fn: () => void) {
  window.addEventListener("rda-student-checkout", fn);
  return () => window.removeEventListener("rda-student-checkout", fn);
}
function snapshot() {
  try {
    const id = sessionStorage.getItem(STORAGE);
    return /^[a-f0-9-]{36}$/i.test(id ?? "") ? id : null;
  } catch {
    return null;
  }
}
function changeHold(id?: string) {
  if (id) sessionStorage.setItem(STORAGE, id);
  else sessionStorage.removeItem(STORAGE);
  window.dispatchEvent(new Event("rda-student-checkout"));
}
/** Saved-checkout state shared by the enrollment form and the all-dates-full recovery block. */
function useStudentCheckout() {
  const held = useSyncExternalStore(subscribe, snapshot, () => null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const inFlightRef = useRef(false);
  async function reconcile() {
    if (!held || inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/student-enrollment/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: held }),
      });
      const result = await response.json();
      if (response.status === 404) {
        changeHold();
        setMessage(
          "No checkout was found for this browser. Contact the academy if you paid using another browser.",
        );
        return;
      }
      if (!response.ok)
        throw new Error(result.error ?? "Verification unavailable.");
      if (result.status === "paid" || result.status === "refunded") {
        // A document navigation keeps this private URL out of analytics history listeners.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/enroll/confirmation?enrollment=${held}`);
        return;
      }
      if (result.status === "expired") {
        changeHold();
        setMessage(
          "Stripe verified that the unpaid checkout has closed. You can choose a date again.",
        );
      } else
        setMessage("Payment is still being verified. Your seat remains held.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Verification unavailable.",
      );
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }
  return { held, busy, setBusy, message, setMessage, inFlightRef, reconcile };
}
function SavedCheckoutActions({
  held,
  busy,
  reconcile,
}: {
  held: string;
  busy: boolean;
  reconcile: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="break-all text-sm">Saved checkout reference: {held}</p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={reconcile}
        disabled={busy}
      >
        Check or close saved checkout
      </Button>
      <a
        href={`/enroll/confirmation?enrollment=${held}`}
        className="block text-primary underline"
      >
        View payment status
      </a>
    </div>
  );
}
function CheckoutStatus({ message }: { message: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-sm text-muted-foreground"
    >
      {message}
    </p>
  );
}
/**
 * Shown when no date can be sold (for example every class is full), so a
 * student with a saved checkout can still verify or close it.
 */
export function StudentSavedCheckoutRecovery() {
  const { held, busy, message, reconcile } = useStudentCheckout();
  if (!held && !message) return null;
  return (
    <div className="space-y-3" data-rda-saved-checkout-recovery="">
      {held && (
        <SavedCheckoutActions held={held} busy={busy} reconcile={reconcile} />
      )}
      <CheckoutStatus message={message} />
    </div>
  );
}
export function StudentEnrollmentForm({
  courseId, courseName, hero, notice,
  offerings,
  policyVersion,
  policy,
  unavailableDates,
  testOnly,
}: {
  courseId: string;
  courseName: string;
  hero: React.ReactNode;
  notice: React.ReactNode;
  offerings: Offering[];
  policyVersion: string;
  policy: React.ReactNode;
  unavailableDates: React.ReactNode;
  testOnly: boolean;
}) {
  const { held, busy, setBusy, message, setMessage, inFlightRef, reconcile } =
    useStudentCheckout();
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [selected, setSelected] = useState(offerings.length === 1 ? offerings[0] : undefined);
  const price = (selected ?? offerings[0]).price.replace(" USD", "");
  function order(offering: Offering) {
    return {
      ...enrollOrderParams(courseId, offering.course_date, offering.amount),
      seats_left_bucket: offering.remaining <= 3 ? "1-3" : "4+",
    };
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current || held || !selected) return;
    inFlightRef.current = true;
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget),
      id = crypto.randomUUID();
    try {
      const bootstrap = await fetch("/api/student-enrollment/session", {
        method: "POST",
      });
      if (!bootstrap.ok)
        throw new Error("Checkout is unavailable. Please try again later.");
      changeHold(id);
      const response = await fetch("/api/student-enrollment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          offeringId: data.get("offeringId"),
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          adultAccepted: data.get("adult") === "on",
          policyAccepted: data.get("policy") === "on",
          policyVersion,
        }),
      });
      const seatResult = { 200: "open", 409: "full", 503: "unavailable" }[response.status];
      if (seatResult) trackEnrollFunnel("seat_check", { ...order(selected), result: seatResult });
      const result = await response.json();
      if (result.holdCreated === false) changeHold();
      if (!response.ok || typeof result.url !== "string")
        throw new Error(result.error ?? "Checkout unavailable.");
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
        throw new Error("Invalid provider redirect.");
      trackEnrollFunnel("begin_checkout", order(selected));
      window.location.assign(url.toString());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Checkout unavailable.",
      );
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} data-rda-course={courseId} className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6">
        <section aria-label="Order summary" aria-live="polite" data-rda-course={courseId} className="space-y-1 rounded-2xl border border-border bg-card p-5 lg:order-2">
          <h2 className="font-heading text-2xl">{courseName}</h2>
          <p className="text-sm text-muted-foreground">
            {selected ? `${selected.label ?? selected.course_date} · ${selected.remaining} ${selected.remaining === 1 ? "seat" : "seats"} left` : "Choose a class date"}
          </p>
          <p className="flex justify-between gap-3 font-semibold"><span>Total due today</span><span>{price}</span></p>
        </section>
        {hero}
      </div>
      <div className="min-w-0 space-y-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-8">
        {notice}
        {testOnly && (
          <p className="text-sm font-semibold">
            TEST ONLY. Use fictional adult details and Stripe test cards. No real
            enrollment or money.
          </p>
        )}
        {held && (
          <div className="space-y-3">
            <SavedCheckoutActions held={held} busy={busy} reconcile={reconcile} />
            <CheckoutStatus message={message} />
          </div>
        )}
        <fieldset
          className="min-w-0 space-y-3"
          data-rda-ic-sessions=""
          disabled={busy || Boolean(held)}
        >
          <legend className="mb-4 font-heading text-2xl">Class date</legend>
          {offerings.map((offering) => (
            <label
              key={offering.id}
              data-rda-ic-session={offering.course_date}
              data-rda-ic-session-status="open"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-input px-4 py-4 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="offeringId"
                value={offering.id}
                required
                checked={selected?.id === offering.id}
                onChange={() => {
                  setSelected(offering);
                  trackEnrollFunnel("enroll_date_select", order(offering));
                }}
                className="size-5 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {offering.label ?? offering.course_date}
                </span>
                <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold">{offering.price}</span>
                  <span className={`${offering.remaining <= 3 ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                    {offering.remaining}{" "}
                    {offering.remaining === 1 ? "seat" : "seats"} left
                  </span>
                </span>
              </span>
            </label>
          ))}
          {unavailableDates}
        </fieldset>
        <div className="border-t border-border pt-7">
          <fieldset
            disabled={busy || Boolean(held)}
            className="min-w-0 space-y-5"
          >
            <legend className="mb-4 font-heading text-2xl">
              Student details
            </legend>
            <div className="space-y-2">
              <Label htmlFor="student-name">Full name</Label>
              <Input
                id="student-name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                className="h-12 px-3 md:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-email">
                Email
              </Label>
              <Input
                id="student-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                className="h-12 px-3 md:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-phone">Phone</Label>
              <Input
                id="student-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                minLength={7}
                maxLength={30}
                className="h-12 px-3 md:text-base"
              />
            </div>
          </fieldset>
        </div>
        <section
          aria-labelledby="review-heading"
          className="space-y-4 border-t border-border pt-7"
        >
          <h2 id="review-heading" className="font-heading text-2xl">
            Review and pay
          </h2>
          {policy}
          <fieldset className="divide-y divide-border rounded-xl border border-border px-4">
            <legend className="px-2 font-semibold">Confirm</legend>
            <Label className="flex min-h-12 cursor-pointer items-start gap-3 py-3 text-sm leading-relaxed">
              <input
                name="adult"
                type="checkbox"
                required
                disabled={busy || Boolean(held)}
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
              <span>I confirm that I am at least 18 years old.</span>
            </Label>
            <Label className="flex min-h-12 cursor-pointer items-start gap-3 py-3 text-sm leading-relaxed">
              <input
                name="policy"
                type="checkbox"
                required
                disabled={busy || Boolean(held)}
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
              <span>
                I have read, understood, and accepted the Cancellation and Refund
                Policy above. Full payment is required.
              </span>
            </Label>
          </fieldset>
          <Button
            type="submit"
            onClick={() => trackEnrollFunnel("enroll_start", selected ? order(selected) : { course_id: courseId })}
            className="h-auto min-h-12 w-full gap-2 whitespace-normal rounded-xl px-3 py-3 text-base"
            disabled={!ready || busy || Boolean(held) || !offerings.length}
          >
            {busy
              ? "Verifying checkout…"
              : testOnly
                ? "Continue to Stripe test checkout"
                : `Pay ${price} securely`}
            <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </Button>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{" "}
            Payment details are entered securely at Stripe.
          </p>
          {!held && <CheckoutStatus message={message} />}
        </section>
        <p className="border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
          We use your contact details to manage and confirm your enrollment.
        </p>
      </div>
    </form>
  );
}
