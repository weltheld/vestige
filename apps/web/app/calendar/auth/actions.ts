"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@vestige/db/server";

export async function signOutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/calendar/login");
}
