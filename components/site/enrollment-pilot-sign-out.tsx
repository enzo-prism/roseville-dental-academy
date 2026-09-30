"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function EnrollmentPilotSignOut() {
  const router = useRouter(), [busy,setBusy] = useState(false), [error,setError] = useState("");
  return <div className="space-y-2"><Button variant="outline" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try { const response = await fetch("/api/enrollment/logout", { method:"POST" });
      if (!response.ok) throw new Error("Sign-out unavailable. Retry before leaving this shared device.");
      router.replace("/enrollment-pilot"); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Sign-out unavailable."); } finally { setBusy(false); }
  }}>{busy ? "Signing out…" : "Sign out of staff pilot"}</Button><p role={error ? "alert" : undefined} className="text-sm text-muted-foreground">{error}</p></div>;
}
