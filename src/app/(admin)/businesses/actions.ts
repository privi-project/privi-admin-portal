"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired, isValidEmail } from "@/lib/validation";
import { uploadBusinessLogo } from "@/lib/businesses/logo-upload";
import { createAutoDraftNotification } from "@/lib/notifications/auto-draft";

export type BusinessFormState = { error?: string } | undefined;

function readBusinessFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    short_description: String(formData.get("short_description") ?? "").trim() || null,
    about_description: String(formData.get("about_description") ?? "").trim() || null,
    search_keywords: String(formData.get("search_keywords") ?? "").trim() || null,
    // Business-level contact — the founder's own point of contact at the
    // business, never shown to members. Per-location phone (shown to
    // members) lives on business_locations instead.
    contact_name: String(formData.get("contact_name") ?? "").trim(),
    contact_email: String(formData.get("contact_email") ?? "").trim(),
    contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    internal_notes: String(formData.get("internal_notes") ?? "").trim() || null,
  };
}

/**
 * Resolves logo_url from an uploaded file, falling back to whatever was
 * already saved (edit forms carry it via a hidden "current_logo_url"
 * field) when no new file is selected.
 */
async function resolveLogoUrl(
  formData: FormData,
): Promise<{ url: string | null } | { error: string }> {
  const file = formData.get("logo_file");
  const currentUrl = String(formData.get("current_logo_url") ?? "").trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    return { url: currentUrl };
  }

  const result = await uploadBusinessLogo(file);
  if ("error" in result) return { error: result.error };
  return { url: result.url };
}

function validateBusinessFields(
  fields: ReturnType<typeof readBusinessFields>,
  categoryIds: string[],
): string | null {
  if (!isRequired(fields.name)) return "Business name is required.";
  if (!isRequired(fields.contact_name)) return "Contact name is required.";
  if (!isRequired(fields.contact_email) || !isValidEmail(fields.contact_email)) {
    return "A valid contact email is required.";
  }
  if (categoryIds.length === 0) return "Select at least one category.";
  return null;
}

async function syncBusinessCategories(businessId: string, categoryIds: string[]) {
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient.from("business_categories").delete().eq("business_id", businessId);
  if (categoryIds.length > 0) {
    await adminClient
      .from("business_categories")
      .insert(categoryIds.map((categoryId) => ({ business_id: businessId, category_id: categoryId })));
  }
}

export async function createBusinessAction(
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const session = await requireAdminSession();
  const fields = readBusinessFields(formData);
  const categoryIds = formData.getAll("categoryIds").map(String);

  const validationError = validateBusinessFields(fields, categoryIds);
  if (validationError) return { error: validationError };

  const logoResult = await resolveLogoUrl(formData);
  if ("error" in logoResult) return { error: logoResult.error };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data, error } = await adminClient
    .from("businesses")
    .insert({
      ...fields,
      logo_url: logoResult.url,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the business." };
  }

  await syncBusinessCategories(data.id, categoryIds);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "created",
    entityType: "business",
    entityId: data.id,
    entityLabel: fields.name,
  });

  revalidatePath("/businesses");
  redirect(`/businesses/${data.id}/edit`);
}

export async function updateBusinessAction(
  id: string,
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const session = await requireAdminSession();
  const fields = readBusinessFields(formData);
  const categoryIds = formData.getAll("categoryIds").map(String);

  const validationError = validateBusinessFields(fields, categoryIds);
  if (validationError) return { error: validationError };

  const logoResult = await resolveLogoUrl(formData);
  if ("error" in logoResult) return { error: logoResult.error };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("businesses")
    .update({
      ...fields,
      logo_url: logoResult.url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await syncBusinessCategories(id, categoryIds);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "business",
    entityId: id,
    entityLabel: fields.name,
  });

  revalidatePath("/businesses");
  revalidatePath(`/businesses/${id}/edit`);
  redirect(`/businesses/${id}/edit`);
}

export async function publishBusinessAction(id: string, name: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("businesses")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "published",
    entityType: "business",
    entityId: id,
    entityLabel: name,
  });

  await createAutoDraftNotification(adminClient, {
    title: `${name} has joined Privi`,
    body: "Discover Member Benefits",
    notificationType: "new_business",
    linkedBusinessId: id,
    createdBy: session.userId,
  });

  revalidatePath("/businesses");
  revalidatePath("/notifications");
  redirect("/businesses");
}

export async function toggleBusinessActiveAction(id: string, name: string, nextActive: boolean) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("businesses")
    .update({ status: nextActive ? "active" : "inactive", updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: nextActive ? "activated" : "deactivated",
    entityType: "business",
    entityId: id,
    entityLabel: name,
  });

  revalidatePath("/businesses");
}

export async function archiveBusinessAction(id: string, name: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("businesses")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "archived",
    entityType: "business",
    entityId: id,
    entityLabel: name,
  });

  revalidatePath("/businesses");
  revalidatePath(`/businesses/${id}/edit`);
}

/**
 * Hard delete — only for businesses that never went live (e.g. a test
 * entry or a mistake). Anything that was ever active must be archived
 * instead, never deleted. The draft-only check happens server-side, not
 * just hidden in the UI. business_categories/business_locations rows
 * cascade-delete automatically (on delete cascade in schema.sql).
 */
export async function deleteBusinessAction(id: string, name: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: business } = await adminClient
    .from("businesses")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!business || business.status !== "draft") {
    return;
  }

  await adminClient.from("businesses").delete().eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deleted",
    entityType: "business",
    entityId: id,
    entityLabel: name,
  });

  revalidatePath("/businesses");
  redirect("/businesses");
}

export async function unarchiveBusinessAction(id: string, name: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("businesses")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "unarchived",
    entityType: "business",
    entityId: id,
    entityLabel: name,
  });

  revalidatePath("/businesses");
  revalidatePath(`/businesses/${id}/edit`);
}
