"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_ACTIVITY_COOKIE, ADMIN_TIMEOUT_MINUTES_COOKIE } from "@/lib/auth/constants";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_ACTIVITY_COOKIE);
  cookieStore.delete(ADMIN_TIMEOUT_MINUTES_COOKIE);
  redirect("/login");
}
