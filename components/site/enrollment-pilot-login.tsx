"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function EnrollmentPilotLogin() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    const form = event.currentTarget;
    try { const response = await fetch("/api/enrollment/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: new FormData(form).get("password") }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Sign-in unavailable.");
      form.reset(); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Sign-in unavailable."); } finally { setBusy(false); }
  }}><Label htmlFor="enrollment-staff-password">Staff pilot password</Label>
    <Input id="enrollment-staff-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={busy} />
    <Button disabled={busy}>{busy ? "Signing in…" : "Sign in to private test checkout"}</Button>
    <p role={error ? "alert" : undefined} className="text-sm text-muted-foreground">{error}</p>
  </form>;
}
