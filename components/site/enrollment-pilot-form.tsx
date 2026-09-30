"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HOLD_STORAGE_KEY = "rda-test-checkout-hold";
function subscribeToHold(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener("rda-test-hold", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("rda-test-hold", callback); };
}
function holdSnapshot() { try { return sessionStorage.getItem(HOLD_STORAGE_KEY); } catch { return null; } }
function serverHoldSnapshot() { return null; }
function clientReady() { return true; }
function serverReady() { return false; }
function savedHold(raw: string | null): { id: string; date: string } | null {
  try { const value = JSON.parse(raw ?? "null");
    return value && typeof value.id === "string" && /^[a-f0-9-]{36}$/i.test(value.id)
      && typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date) ? value : null;
  } catch { return null; }
}
export function EnrollmentPilotForm({ dates, policyVersion }: { dates: { isoDate: string; date: string }[]; policyVersion: string }) {
  const hold = savedHold(useSyncExternalStore(subscribeToHold, holdSnapshot, serverHoldSnapshot));
  const ready = useSyncExternalStore(subscribeToHold, clientReady, serverReady);
  const [chosenDate, setChosenDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || hold) return;
    inFlight.current = true;
    const data = new FormData(event.currentTarget);
    const date = String(data.get("date"));
    const id = crypto.randomUUID();
    setBusy(true); setMessage("");
    // Persist only an opaque hold UUID so a cancelled checkout can be reconciled after navigation.
    try {
      sessionStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify({ id, date }));
      window.dispatchEvent(new Event("rda-test-hold"));
      const response = await fetch("/api/enrollment/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId: id, date, policyAccepted: data.get("policy") === "on", policyVersion }) });
      const result = await response.json();
      if (result.holdCreated === false) { sessionStorage.removeItem(HOLD_STORAGE_KEY); window.dispatchEvent(new Event("rda-test-hold")); }
      if (!response.ok || typeof result.url !== "string") throw new Error(result.error ?? "Test checkout unavailable.");
      window.location.assign(result.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Test checkout unavailable."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function reconcile() {
    const id = hold?.id;
    if (!id || inFlight.current) { setMessage("No test hold is saved in this browser session."); return; }
    inFlight.current = true;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/enrollment/reconcile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holdId: id }) });
      const result = await response.json();
      if (response.status === 404) {
        // Discard only the browser reference. This never changes a database hold or frees a Stripe-backed seat.
        sessionStorage.removeItem(HOLD_STORAGE_KEY); window.dispatchEvent(new Event("rda-test-hold"));
        setChosenDate(""); setMessage("No test hold was found for this staff account. The browser reference was cleared; no database seat was released."); return;
      }
      if (!response.ok) throw new Error(result.error ?? "Test hold could not be verified.");
      if (result.status === "expired" || result.status === "paid") {
        sessionStorage.removeItem(HOLD_STORAGE_KEY);
        window.dispatchEvent(new Event("rda-test-hold"));
        setChosenDate("");
        setMessage(result.status === "paid" ? "Stripe verified this test payment. No real enrollment was created." : "Stripe verified the test checkout is expired. Its test seat is released.");
      } else { setMessage("The test hold remains reserved until Stripe verifies closure."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Test hold unavailable."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-6">
    <div className="space-y-2">
      <Label htmlFor="enrollment-test-date">Course date</Label>
      <select id="enrollment-test-date" name="date" required disabled={!ready || busy || Boolean(hold)} value={hold?.date ?? chosenDate} onChange={(event) => setChosenDate(event.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-foreground">
        <option value="">Choose an available date</option>
        {dates.map((date) => <option key={date.isoDate} value={date.isoDate}>{date.date}</option>)}
      </select>
      {hold && <Input type="hidden" name="date" value={hold.date} />}
    </div>
    <p>Full payment: $395.00 USD. Capacity: 12 test seats per date. These test seats are separate from real course availability.</p>
    <Label htmlFor="enrollment-test-policy" className="flex items-start gap-3">
      <input id="enrollment-test-policy" name="policy" type="checkbox" required disabled={busy} className="mt-1 size-4 shrink-0" />
      <span>I have read, understood, and accepted the Cancellation and Refund Policy displayed above. I understand this is a test and creates no actual enrollment.</span>
    </Label>
    <Button type="submit" disabled={!ready || busy || dates.length === 0 || Boolean(hold)}>{busy ? "Verifying test checkout…" : "Continue to Stripe test checkout"}</Button>
    <div><Button type="button" variant="outline" disabled={busy} onClick={reconcile}>Close or verify an abandoned test checkout</Button></div>
    <p aria-live="polite" role={message ? "status" : undefined} className="text-sm text-muted-foreground">{message || (hold ? "A previous test checkout is still saved. Close or verify it before starting another test." : "")}</p>
    <p className="text-sm text-muted-foreground">Use Stripe test card 4242 4242 4242 4242 with a future expiry date and any three-digit CVC. Use a fictional email address. Never enter real card details.</p>
  </form>;
}
