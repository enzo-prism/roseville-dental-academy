"use client";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type Offering = {
  id: string;
  course_date: string;
  label?: string;
  price: string;
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
  const router = useRouter();
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
        router.push(`/enroll/confirmation?enrollment=${held}`);
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
  offerings,
  policyVersion,
  policy,
  unavailableDates,
  testOnly,
}: {
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
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current || held) return;
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
      const result = await response.json();
      if (result.holdCreated === false) changeHold();
      if (!response.ok || typeof result.url !== "string")
        throw new Error(result.error ?? "Checkout unavailable.");
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
        throw new Error("Invalid provider redirect.");
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
    <form onSubmit={submit} className="space-y-8">
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
              defaultChecked={offerings.length === 1}
              className="size-5 shrink-0 accent-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {offering.label ?? offering.course_date}
              </span>
              <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold">{offering.price}</span>
                <span className="text-muted-foreground">
                  {offering.remaining}{" "}
                  {offering.remaining === 1 ? "seat" : "seats"} available
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
            <Label htmlFor="student-name">Student full name</Label>
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
              Email for enrollment confirmation
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
            <Label htmlFor="student-phone">Phone number</Label>
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
        <div className="divide-y divide-border">
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
        </div>
        <Button
          type="submit"
          className="h-auto min-h-12 w-full gap-2 whitespace-normal rounded-xl px-3 py-3 text-base"
          disabled={!ready || busy || Boolean(held) || !offerings.length}
        >
          {busy
            ? "Verifying checkout…"
            : testOnly
              ? "Continue to Stripe test checkout"
              : "Continue to secure payment"}
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
        </Button>
        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{" "}
          Payment details are entered securely at Stripe.
        </p>
        {!held && <CheckoutStatus message={message} />}
      </section>
      <p className="border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
        Your name, email, and phone are used to manage your enrollment and
        payment confirmation. Contact the academy for record corrections.
      </p>
    </form>
  );
}
