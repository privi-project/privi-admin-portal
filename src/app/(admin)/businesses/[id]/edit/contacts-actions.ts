"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired } from "@/lib/validation";
import { CONTACT_CATEGORIES } from "@/lib/contacts/categories";

export type ContactFormState = { error?: string } | undefined;

export async function addBusinessContactAction(
  businessId: string,
  businessName: string,
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const session = await requireAdminSession();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const categories = CONTACT_CATEGORIES.map((c) => c.value).filter((v) => formData.get(`category_${v}`) === "on");

  if (!isRequired(name)) return { error: "Name is required." };
  if (!isRequired(email)) return { error: "Email is required." };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient.from("business_contacts").insert({
    business_id: businessId,
    name,
    email,
    categories,
  });

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "added contact",
    entityType: "business",
    entityId: businessId,
    entityLabel: `${businessName} — ${name} (${categories.join(", ") || "no category"})`,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}

export async function deleteBusinessContactAction(businessId: string, contactId: string, contactName: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient.from("business_contacts").delete().eq("id", contactId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "removed contact",
    entityType: "business",
    entityId: businessId,
    entityLabel: contactName,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}
