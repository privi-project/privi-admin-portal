"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired } from "@/lib/validation";
import { getSeasonBannerCategoryIds } from "@/lib/season-banners/queries";

export type SeasonBannerFormState = { error?: string } | undefined;

const ACTION_TYPES = ["none", "categories", "external_link"];

function readBannerFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    action_type: String(formData.get("action_type") ?? "none"),
    action_url: String(formData.get("action_url") ?? "").trim() || null,
    starts_at: String(formData.get("starts_at") ?? "").trim() || null,
    ends_at: String(formData.get("ends_at") ?? "").trim() || null,
  };
}

function validateBannerFields(fields: ReturnType<typeof readBannerFields>): string | null {
  if (!isRequired(fields.title)) return "Title is required.";
  if (!isRequired(fields.message)) return "Message is required.";
  if (!ACTION_TYPES.includes(fields.action_type)) return "Invalid action type.";
  if (fields.action_type === "external_link" && !fields.action_url) {
    return "Enter a URL for the link action.";
  }
  if (fields.starts_at && fields.ends_at && fields.starts_at > fields.ends_at) {
    return "The start date can't be after the end date.";
  }
  return null;
}

async function syncBannerCategories(adminClient: NonNullable<ReturnType<typeof createAdminClient>>, bannerId: string, categoryIds: string[]) {
  await adminClient.from("season_banner_categories").delete().eq("banner_id", bannerId);
  if (categoryIds.length > 0) {
    await adminClient
      .from("season_banner_categories")
      .insert(categoryIds.map((categoryId) => ({ banner_id: bannerId, category_id: categoryId })));
  }
}

export async function createSeasonBannerAction(
  _prevState: SeasonBannerFormState,
  formData: FormData,
): Promise<SeasonBannerFormState> {
  const session = await requireAdminSession();
  const fields = readBannerFields(formData);
  const categoryIds = formData.getAll("categoryIds").map(String);

  const validationError = validateBannerFields(fields);
  if (validationError) return { error: validationError };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  // A banner given a start/end date is, by definition, being scheduled to
  // go live automatically — defaulting is_active to true for that case is
  // what makes "prep the whole year and forget it" actually true, rather
  // than needing a second manual Activate click per banner on top of the
  // dates already set. A banner with no dates keeps the old behaviour
  // (starts inactive, switched on by hand from the list page) since there's
  // no schedule to hand control to.
  const isScheduled = !!(fields.starts_at || fields.ends_at);

  const { data, error } = await adminClient
    .from("season_banners")
    .insert({ ...fields, is_active: isScheduled, created_by: session.userId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the banner." };
  }

  if (fields.action_type === "categories") {
    await syncBannerCategories(adminClient, data.id, categoryIds);
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "created",
    entityType: "banner",
    entityLabel: `Season banner: ${fields.title}`,
  });

  revalidatePath("/app-data/season-banners");
  redirect("/app-data/season-banners");
}

export async function updateSeasonBannerAction(
  id: string,
  _prevState: SeasonBannerFormState,
  formData: FormData,
): Promise<SeasonBannerFormState> {
  const session = await requireAdminSession();
  const fields = readBannerFields(formData);
  const categoryIds = formData.getAll("categoryIds").map(String);

  const validationError = validateBannerFields(fields);
  if (validationError) return { error: validationError };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("season_banners")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  await syncBannerCategories(adminClient, id, fields.action_type === "categories" ? categoryIds : []);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "banner",
    entityId: id,
    entityLabel: `Season banner: ${fields.title}`,
  });

  revalidatePath("/app-data/season-banners");
  redirect("/app-data/season-banners");
}

// Same idea as businesses/[id]/locations' duplicateLocationAction — next
// year, copy this year's Christmas/Easter/etc. banner rather than
// re-typing it, then just move the dates forward. Never clone straight
// into an armed/dated state: the copy starts inactive with no dates, so
// the founder reviews and sets next year's window deliberately rather
// than a stale date range silently going live unedited.
export async function duplicateSeasonBannerAction(bannerId: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: original } = await adminClient
    .from("season_banners")
    .select("title, message, action_type, action_url")
    .eq("id", bannerId)
    .maybeSingle();

  if (!original) return;

  const categoryIds = await getSeasonBannerCategoryIds(bannerId);

  const { data: copy, error } = await adminClient
    .from("season_banners")
    .insert({
      ...original,
      title: `${original.title} (copy)`,
      is_active: false,
      starts_at: null,
      ends_at: null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !copy) return;

  if (original.action_type === "categories" && categoryIds.length > 0) {
    await adminClient
      .from("season_banner_categories")
      .insert(categoryIds.map((categoryId) => ({ banner_id: copy.id, category_id: categoryId })));
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "duplicated",
    entityType: "banner",
    entityId: copy.id,
    entityLabel: `Season banner: ${original.title}`,
  });

  revalidatePath("/app-data/season-banners");
  redirect(`/app-data/season-banners/${copy.id}/edit`);
}

export async function toggleSeasonBannerActiveAction(id: string, title: string, nextActive: boolean) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("season_banners")
    .update({ is_active: nextActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: nextActive ? "activated" : "deactivated",
    entityType: "banner",
    entityId: id,
    entityLabel: `Season banner: ${title}`,
  });

  revalidatePath("/app-data/season-banners");
}

// Only allowed while inactive — can't delete something currently showing
// to members out from under them.
export async function deleteSeasonBannerAction(id: string, title: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: banner } = await adminClient
    .from("season_banners")
    .select("is_active")
    .eq("id", id)
    .maybeSingle();

  if (!banner || banner.is_active) return;

  await adminClient.from("season_banners").delete().eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deleted",
    entityType: "banner",
    entityId: id,
    entityLabel: `Season banner: ${title}`,
  });

  revalidatePath("/app-data/season-banners");
}
