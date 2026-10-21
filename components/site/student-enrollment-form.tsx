"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type Offering = {
  id: string;
  course_date: string;
  label?: string;
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
export function StudentEnrollmentForm({
  offerings,
  policyVersion,
  testOnly,
}: {
  offerings: Offering[];
  policyVersion: string;
  testOnly: boolean;
}) {
  const router = useRouter();
  const held = useSyncExternalStore(subscribe, snapshot, () => null);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const inFlight = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || held) return;
    inFlight.current = true;
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
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function reconcile() {
    if (!held || inFlight.current) return;
    inFlight.current = true;
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
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      {testOnly && (
        <p className="font-semibold">
          TEST ONLY. Use fictional adult details and Stripe test cards. No real
          enrollment or money.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="student-course-date">
          Course date and full payment
        </Label>
        <select
          id="student-course-date"
          name="offeringId"
          required
          disabled={busy || Boolean(held)}
          className="w-full rounded-md border border-input bg-card px-3 py-2"
        >
          <option value="">Choose an available date</option>
          {offerings.map((o) => (
            <option key={o.id} value={o.id} disabled={o.remaining <= 0}>
              {o.label ?? o.course_date} · ${(o.amount / 100).toFixed(2)} USD ·{" "}
              {Math.max(0, o.remaining)} seats available
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="student-name">Student full name</Label>
        <Input
          id="student-name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          disabled={busy || Boolean(held)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="student-email">Email for enrollment confirmation</Label>
        <Input
          id="student-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          disabled={busy || Boolean(held)}
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
          disabled={busy || Boolean(held)}
        />
      </div>
      <Label className="flex items-start gap-3">
        <input
          name="adult"
          type="checkbox"
          required
          disabled={busy || Boolean(held)}
          className="mt-1 size-4 shrink-0"
        />
        <span>I confirm that I am at least 18 years old.</span>
      </Label>
      <Label className="flex items-start gap-3">
        <input
          name="policy"
          type="checkbox"
          required
          disabled={busy || Boolean(held)}
          className="mt-1 size-4 shrink-0"
        />
        <span>
          I have read, understood, and accepted the Cancellation and Refund
          Policy above. Full payment is required.
        </span>
      </Label>
      <p className="text-sm text-muted-foreground">
        Your name, email, and phone are used to manage your enrollment and
        payment confirmation. Payment details are entered securely at Stripe.
        Contact the academy for record corrections.
      </p>
      <Button
        type="submit"
        disabled={
          !ready ||
          busy ||
          Boolean(held) ||
          !offerings.some((o) => o.remaining > 0)
        }
      >
        {busy
          ? "Verifying checkout…"
          : testOnly
            ? "Continue to Stripe test checkout"
            : "Continue to secure payment"}
      </Button>
      {held && (
        <div className="space-y-3">
          <p className="text-sm">Saved checkout reference: {held}</p>
          <Button
            type="button"
            variant="outline"
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
      )}
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {message}
      </p>
    </form>
  );
}
