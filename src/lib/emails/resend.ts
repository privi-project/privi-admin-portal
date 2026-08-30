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
}: {
  to: string;
  subject: string;
  html: string;
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
        to: [to],
        subject,
        html,
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
