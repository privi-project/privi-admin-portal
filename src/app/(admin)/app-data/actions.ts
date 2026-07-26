"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";

export type SettingsFormState = { error?: string; saved?: boolean } | undefined;

function textOrNull(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function updateSystemSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await requireAdminSession();

  const expiryDaysRaw = String(formData.get("default_expiry_warning_days") ?? "");
  const expiryDays = Number(expiryDaysRaw);
  if (!Number.isInteger(expiryDays) || expiryDays < 1) {
    return { error: "Expiry warning period must be a whole number of days (1 or more)." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("system_settings")
    .update({
      default_expiry_warning_days: expiryDays,
      help_faq_url: textOrNull(formData, "help_faq_url"),
      privacy_policy_url: textOrNull(formData, "privacy_policy_url"),
      terms_url: textOrNull(formData, "terms_url"),
      subscription_terms_url: textOrNull(formData, "subscription_terms_url"),
      member_rules_url: textOrNull(formData, "member_rules_url"),
      app_store_url: textOrNull(formData, "app_store_url"),
      google_play_url: textOrNull(formData, "google_play_url"),
      support_email: textOrNull(formData, "support_email"),
      business_contact_email: textOrNull(formData, "business_contact_email"),
      privacy_contact_email: textOrNull(formData, "privacy_contact_email"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "settings",
    entityLabel: "System settings",
  });

  revalidatePath("/app-data");
  return { saved: true };
}
