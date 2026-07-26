"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function MfaResetControl() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.all ?? []).find(
        (f) => f.factor_type === "totp" && f.status === "verified",
      );
      if (!cancelled) setFactorId(verified?.id ?? null);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleReset() {
    if (!factorId) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollError) {
        setError(unenrollError.message);
        return;
      }
      setOpen(false);
      router.push("/mfa/enroll");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        Two-factor authentication:{" "}
        <span className="font-medium text-status-success">
          {factorId ? "Enabled" : "Checking…"}
        </span>
      </p>
      {error && (
        <p className="text-sm text-status-danger" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={!factorId}
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        Reset 2FA
      </button>
      <ConfirmDialog
        open={open}
        title="Reset two-factor authentication?"
        description="You'll be signed out of your current authenticator and taken straight to set up a new one — you won't be able to access the portal again until you do."
        confirmLabel="Reset 2FA"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={handleReset}
      />
    </div>
  );
}
