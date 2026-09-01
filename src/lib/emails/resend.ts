// Trimmed duplicate of website's src/lib/resend.ts (same reasoning as
// shell.ts in this folder — a small one-time feature, not worth a
// shared package for). Needs RESEND_API_KEY set as an env var on THIS
// project's Vercel deployment too — it's currently only configured on
// website's, and Resend API keys aren't tied to a single domain/project,
// so the same key value can be reused here safely.
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  /** A single address, or several — e.g. every business_contacts row
   * tagged for a given category (2026-09-02). Sent as one email with
   * all of them in "To", not separate copies — normal for a shared
   * business inbox situation, and simpler than tracking N individual
   * sends. */
  to: string | string[];
  subject: string;
  html: string;
  /** 2026-09-01: Featured Placement emails (featured.ts) set this to
   * partners@privi.info — a business replying to an activation/renewal
   * notice should land with the founder, not bounce off a genuine
   * no-reply address. Omitted entirely (not just left undefined) when
   * not passed, rather than sending an empty reply_to field. */
  replyTo?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("sendTransactionalEmail: RESEND_API_KEY is not configured, skipping send");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Privi <noreply@privi.info>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("sendTransactionalEmail: Resend API error", response.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendTransactionalEmail: request failed", err);
    return false;
  }
}
