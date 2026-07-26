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
    .order("display_order", { ascending: true });

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
