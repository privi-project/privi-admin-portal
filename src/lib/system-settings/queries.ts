import { createAdminClient } from "@/lib/supabase/admin";

export type SystemSettings = {
  default_expiry_warning_days: number;
  help_faq_url: string | null;
  privacy_policy_url: string | null;
  terms_url: string | null;
  subscription_terms_url: string | null;
  member_rules_url: string | null;
  app_store_url: string | null;
  google_play_url: string | null;
  support_email: string | null;
  business_contact_email: string | null;
  privacy_contact_email: string | null;
  session_timeout_minutes: number;
  max_failed_login_attempts: number;
  lockout_minutes: number;
};

const DEFAULTS: SystemSettings = {
  default_expiry_warning_days: 7,
  help_faq_url: null,
  privacy_policy_url: null,
  terms_url: null,
  subscription_terms_url: null,
  member_rules_url: null,
  app_store_url: null,
  google_play_url: null,
  support_email: null,
  business_contact_email: null,
  privacy_contact_email: null,
  session_timeout_minutes: 30,
  max_failed_login_attempts: 5,
  lockout_minutes: 15,
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const adminClient = createAdminClient();
  if (!adminClient) return DEFAULTS;

  const { data } = await adminClient
    .from("system_settings")
    .select(
      "default_expiry_warning_days, help_faq_url, privacy_policy_url, terms_url, subscription_terms_url, member_rules_url, app_store_url, google_play_url, support_email, business_contact_email, privacy_contact_email, session_timeout_minutes, max_failed_login_attempts, lockout_minutes",
    )
    .eq("id", 1)
    .maybeSingle();

  return data ?? DEFAULTS;
}
