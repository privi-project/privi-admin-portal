"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MfaChallengePage() {
  return (
    <Suspense fallback={null}>
      <MfaChallengeForm />
    </Suspense>
  );
}

function MfaChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Constructed lazily, inside the effect — never at component-body
      // top-level, so it's never invoked during Next's static prerender
      // pass (same convention as website's src/app/signup/page.tsx).
      const supabase = createClient();
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        if (!cancelled) setError(factorsError.message);
        return;
      }

      const verified = (data?.all ?? []).find(
        (f) => f.factor_type === "totp" && f.status === "verified",
      );
      if (!verified) {
        router.replace("/mfa/enroll");
        return;
      }

      if (!cancelled) setFactorId(verified.id);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    setIsSubmitting(false);

    if (verifyError) {
      setError("Incorrect code. Try again.");
      return;
    }

    const next = searchParams.get("next") || "/home";
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6 shadow-sm">
        <h1 className="text-center text-lg font-medium">Enter your 2FA code</h1>
        <p className="text-center text-sm text-muted-dark">
          Open your authenticator app and enter the current 6-digit code.
        </p>

        {error && (
          <p className="text-sm text-status-danger" role="alert">
            {error}
          </p>
        )}

        {factorId ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              6-digit code
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                autoFocus
                className="rounded-lg border border-border-hairline px-3 py-2 text-center tracking-widest"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg privi-gold-border border bg-teal px-4 py-2 font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
            >
              {isSubmitting ? "Verifying…" : "Verify"}
            </button>
          </form>
        ) : (
          !error && <p className="text-center text-sm text-muted-dark">Loading…</p>
        )}
      </div>
    </div>
  );
}
