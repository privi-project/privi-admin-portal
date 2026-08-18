"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired, isValidSlug } from "@/lib/validation";
import { NEW_APPLICATION_STATUS_SLUG } from "@/lib/business-applications/config";

export type StatusFormState = { error?: string } | undefined;

export async function createStatusAction(
  _prevState: StatusFormState,
  formData: FormData,
): Promise<StatusFormState> {
  const session = await requireAdminSession();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const label = String(formData.get("label") ?? "").trim();

  if (!isRequired(slug) || !isRequired(label)) {
    return { error: "Slug and label are required." };
  }
  if (!isValidSlug(slug)) {
    return { error: "Slug must be lowercase-kebab-case (e.g. awaiting-contract)." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: maxRow } = await adminClient
    .from("business_application_statuses")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.display_order ?? 0) + 1;

  const { error } = await adminClient.from("business_application_statuses").insert({
    slug,
    label,
    display_order: nextOrder,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "That slug already exists." : error.message,
    };
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "created",
    entityType: "business_application_status",
    entityLabel: label,
  });

  revalidatePath("/business-applications/statuses");
  revalidatePath("/business-applications");
}

export async function updateStatusLabelAction(id: string, label: string) {
  const session = await requireAdminSession();
  if (!isRequired(label)) return;

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("business_application_statuses")
    .update({ label, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return;

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "business_application_status",
    entityId: id,
    entityLabel: label,
  });

  revalidatePath("/business-applications/statuses");
  revalidatePath("/business-applications");
}

/** "New" is protected — it's the DB default every fresh submission lands
 * in, so it can be renamed but never switched off. */
export async function toggleStatusActiveAction(
  id: string,
  slug: string,
  label: string,
  nextActive: boolean,
) {
  const session = await requireAdminSession();
  if (slug === NEW_APPLICATION_STATUS_SLUG && !nextActive) return;

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("business_application_statuses")
    .update({ is_active: nextActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: nextActive ? "activated" : "deactivated",
    entityType: "business_application_status",
    entityId: id,
    entityLabel: label,
  });

  revalidatePath("/business-applications/statuses");
  revalidatePath("/business-applications");
}

export async function moveStatusAction(id: string, direction: "up" | "down") {
  await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: statuses } = await adminClient
    .from("business_application_statuses")
    .select("id, display_order")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!statuses) return;

  const index = statuses.findIndex((s) => s.id === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= statuses.length) return;

  const current = statuses[index];
  const swapWith = statuses[swapIndex];

  const { error: firstError } = await adminClient
    .from("business_application_statuses")
    .update({ display_order: swapWith.display_order })
    .eq("id", current.id);
  if (firstError) throw new Error(`Failed to move column: ${firstError.message}`);

  const { error: secondError } = await adminClient
    .from("business_application_statuses")
    .update({ display_order: current.display_order })
    .eq("id", swapWith.id);
  if (secondError) throw new Error(`Failed to move column: ${secondError.message}`);

  revalidatePath("/business-applications/statuses");
  revalidatePath("/business-applications");
}

/**
 * Hard delete — only allowed when the column is empty (zero applications
 * currently sitting in it) and it isn't the protected "new" column. A
 * column with real cards in it must be deactivated instead, same rule as
 * everywhere else in this project (delete only what nothing references).
 */
export async function deleteStatusAction(id: string, slug: string, label: string) {
  const session = await requireAdminSession();
  if (slug === NEW_APPLICATION_STATUS_SLUG) return;

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { count } = await adminClient
    .from("business_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", slug);

  if ((count ?? 0) > 0) return;

  const { error } = await adminClient.from("business_application_statuses").delete().eq("id", id);
  if (error) return;

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deleted",
    entityType: "business_application_status",
    entityId: id,
    entityLabel: label,
  });

  revalidatePath("/business-applications/statuses");
  revalidatePath("/business-applications");
}
