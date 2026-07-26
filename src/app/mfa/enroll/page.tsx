"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EnrollData = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export default function MfaEnrollPage() {
  const router = useRouter();
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Constructed lazily, inside the effect — never at component-body
      // top-level, so it's never invoked during Next's static prerender
      // pass (same convention as website's src/app/signup/page.tsx).
      const supabase = createClient();
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();
      if (factorsError) {
        if (!cancelled) setError(factorsError.message);
        return;
      }

      // The convenience `data.totp` array is typed verified-only by the SDK,
      // but can contain unverified factors at runtime too — read from
      // `data.all` and filter explicitly instead.
      const totpFactors = (factorsData?.all ?? []).filter(
        (f) => f.factor_type === "totp",
      );

      const verified = totpFactors.find((f) => f.status === "verified");
      if (verified) {
        router.replace("/mfa/challenge");
        return;
      }

      // Clean up any stale unverified factor from an abandoned attempt —
      // enroll() errors if too many unverified factors pile up.
      const unverified = totpFactors.filter((f) => f.status === "unverified");
      for (const factor of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Privi Admin",
      });

      if (enrollError) {
        if (!cancelled) setError(enrollError.message);
        return;
      }

      if (!cancelled && data) {
        setEnrollData({
          factorId: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
        });
      }
    }

    start();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollData) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollData.factorId,
      code,
    });

    setIsSubmitting(false);

    if (verifyError) {
      setError("Incorrect code. Check your authenticator app and try again.");
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6 shadow-sm">
        <h1 className="text-center text-lg font-medium">Set up 2FA</h1>
        <p className="text-center text-sm text-muted-dark">
          Scan this code with your authenticator app (Google Authenticator,
          Authy, 1Password, etc.), then enter the 6-digit code it shows.
        </p>

        {error && (
          <p className="text-sm text-status-danger" role="alert">
            {error}
          </p>
        )}

        {enrollData ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrollData.qrCode}
              alt="Scan with your authenticator app"
              className="mx-auto h-40 w-40"
            />
            <p className="break-all text-center text-xs text-muted-dark">
              Manual entry key: {enrollData.secret}
            </p>

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
                  className="rounded-lg border border-border-hairline px-3 py-2 text-center tracking-widest"
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg privi-gold-border border bg-teal px-4 py-2 font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
              >
                {isSubmitting ? "Verifying…" : "Verify and continue"}
              </button>
            </form>
          </>
        ) : (
          !error && <p className="text-center text-sm text-muted-dark">Loading…</p>
        )}
      </div>
    </div>
  );
}
