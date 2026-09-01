// Trimmed duplicate of website's src/lib/emails/shell.ts (2026-08-31) —
// this repo never had its own email infrastructure before now, and the
// waitlist notification is deliberately a small, one-time-use feature
// (see schema.sql's own comment), so it wasn't worth building a shared
// package across repos for. Kept visually IDENTICAL to website's shell
// so this reads as the same Privi email a recipient has already seen
// (waitlistJoinedEmail, sent when they first joined) rather than
// something different. If this ever needs a third template, consider
// promoting shell.ts into a real shared package instead of a third copy.

export const LOGO_URL = "https://privi.info/brand/privi-logo.png";
export const GOLD = "#e4bc50";
export const CHARCOAL = "#2f2f37";
export const IVORY = "#f7f6f2";
export const TEAL = "#6fa7a1";

const SIGN_OFF = `<p style="margin:20px 0 0 0;">Thanks,<br />The Privi Team</p>`;

export function emailShell(heading: string, bodyHtml: string, footerHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${IVORY};font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${IVORY};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 32px 0 32px;">
                <img src="${LOGO_URL}" alt="Privi" width="27" height="37" style="display:block;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 32px 0 32px;">
                <div style="height:2px;width:64px;background-color:${GOLD};border-radius:1px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                <h1 style="margin:0;font-size:20px;font-weight:600;color:${CHARCOAL};text-align:center;">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;font-size:14px;line-height:1.6;color:${CHARCOAL};text-align:left;">
                ${bodyHtml}
                ${SIGN_OFF}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px;border-top:1px solid #eee;font-size:11px;line-height:1.6;color:#888;">
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const BUTTON_STYLE = `display:inline-block;background-color:${TEAL};color:${IVORY};font-size:13px;font-weight:600;padding:11px 23px;border-radius:8px;border:1.5px solid ${GOLD};`;

export function linkButton(label: string, href: string): string {
  return `<p style="margin:20px 0 0 0;text-align:center;">
    <a href="${href}" style="${BUTTON_STYLE}text-decoration:none;">${label}</a>
  </p>`;
}
