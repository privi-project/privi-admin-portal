"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired, isValidSlug } from "@/lib/validation";

export type CategoryFormState = { error?: string } | undefined;

export async function createCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const session = await requireAdminSession();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const label = String(formData.get("label") ?? "").trim();

  if (!isRequired(slug) || !isRequired(label)) {
    return { error: "Slug and label are required." };
  }
  if (!isValidSlug(slug)) {
    return { error: "Slug must be lowercase-kebab-case (e.g. food-and-drink)." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: maxRow } = await adminClient
    .from("categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.display_order ?? 0) + 1;

  const { error } = await adminClient.from("categories").insert({
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
    entityType: "category",
    entityLabel: label,
  });

  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategoryAction(
  id: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const session = await requireAdminSession();
  const label = String(formData.get("label") ?? "").trim();

  if (!isRequired(label)) {
    return { error: "Label is required." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("categories")
    .update({ label, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "category",
    entityId: id,
    entityLabel: label,
  });

  revalidatePath("/categories");
  redirect("/categories");
}

export async function toggleActiveAction(
  id: string,
  label: string,
  nextActive: boolean,
) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("categories")
    .update({ is_active: nextActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: nextActive ? "activated" : "deactivated",
    entityType: "category",
    entityId: id,
    entityLabel: label,
  });

  revalidatePath("/categories");
}

export async function moveCategoryAction(id: string, direction: "up" | "down") {
  await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: categories } = await adminClient
    .from("categories")
    .select("id, display_order")
    .order("display_order", { ascending: true });

  if (!categories) return;

  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= categories.length) return;

  const current = categories[index];
  const swapWith = categories[swapIndex];

  await adminClient
    .from("categories")
    .update({ display_order: swapWith.display_order })
    .eq("id", current.id);
  await adminClient
    .from("categories")
    .update({ display_order: current.display_order })
    .eq("id", swapWith.id);

  revalidatePath("/categories");
}
