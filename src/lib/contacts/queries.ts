import { createAdminClient } from "@/lib/supabase/admin";

export type BusinessContact = {
  id: string;
  business_id: string;
  name: string;
  email: string;
  categories: string[];
  created_at: string;
};

export async function listBusinessContacts(businessId: string): Promise<BusinessContact[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("business_contacts")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

/**
 * Used by every automated send that supports category routing (Featured
 * lifecycle emails today, more later). Returns the business's own
 * contact_name/contact_email as a single-item fallback list when no
 * business_contacts row is tagged for this category — the common case,
 * since most businesses will never add one — so callers never need their
 * own separate fallback branch.
 */
export async function listContactsForCategory(
  businessId: string,
  category: string,
): Promise<{ name: string; email: string }[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data: tagged } = await adminClient
    .from("business_contacts")
    .select("name, email")
    .eq("business_id", businessId)
    .contains("categories", [category]);

  if (tagged && tagged.length > 0) return tagged;

  const { data: business } = await adminClient
    .from("businesses")
    .select("contact_name, contact_email")
    .eq("id", businessId)
    .maybeSingle();

  if (!business?.contact_email) return [];
  return [{ name: business.contact_name || "", email: business.contact_email }];
}

// "Hi Sarah," for one recipient, "Hi Sarah and John," for two, "Hi Sarah,
// John and Priya," for more — a joint greeting reads better than picking
// one name arbitrarily when a category resolves to several contacts.
export function greetingNames(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "there";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}
