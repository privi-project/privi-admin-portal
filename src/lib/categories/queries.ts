import { createAdminClient } from "@/lib/supabase/admin";

export type Category = {
  id: string;
  slug: string;
  label: string;
  display_order: number;
  is_active: boolean;
};

export async function listCategories(): Promise<Category[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("categories")
    .select("id, slug, label, display_order, is_active")
    // Secondary tiebreak on created_at: a real duplicate display_order
    // pair was found live 2026-08-13 (two categories both at 3, from a
    // create-time race — see moveCategoryAction), which made Postgres's
    // tie order unstable between requests. Keeping this in sync with
    // moveCategoryAction's own ordering below so the list's rendered
    // order always matches what the move action operates on.
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getCategory(id: string): Promise<Category | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data } = await adminClient
    .from("categories")
    .select("id, slug, label, display_order, is_active")
    .eq("id", id)
    .maybeSingle();

  return data ?? null;
}
