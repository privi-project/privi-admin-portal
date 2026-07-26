import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSystemSettings } from "@/lib/system-settings/queries";
import { ChangePasswordForm } from "./change-password-form";
import { MfaResetControl } from "./mfa-reset-control";
import { SecuritySettingsForm } from "./security-settings-form";

export default async function SettingsPage() {
  const session = await requireAdminSession();

  const adminClient = createAdminClient();
  const [{ data: adminRow }, settings] = await Promise.all([
    adminClient
      ? adminClient.from("admin_users").select("last_login_at").eq("id", session.userId).maybeSingle()
      : Promise.resolve({ data: null }),
    getSystemSettings(),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Settings</h1>

      <div className="mt-6 flex max-w-xl flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6">
          <h2 className="text-sm font-medium text-muted-dark">Your account</h2>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-dark">Email</dt>
              <dd>{session.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-dark">Last login</dt>
              <dd>{adminRow?.last_login_at ? new Date(adminRow.last_login_at).toLocaleString() : "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6">
          <h2 className="text-sm font-medium text-muted-dark">Change password</h2>
          <ChangePasswordForm />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6">
          <h2 className="text-sm font-medium text-muted-dark">Two-factor authentication</h2>
          <MfaResetControl />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6">
          <h2 className="text-sm font-medium text-muted-dark">Security settings</h2>
          <SecuritySettingsForm
            sessionTimeoutMinutes={settings.session_timeout_minutes}
            maxFailedLoginAttempts={settings.max_failed_login_attempts}
            lockoutMinutes={settings.lockout_minutes}
          />
        </section>

        <p className="text-xs text-muted-dark">
          Looking for offer expiry warnings, app links, or support contact
          details? Those live under App Data, not here.
        </p>
      </div>
    </div>
  );
}
