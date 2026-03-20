import { createServerClient } from "@/lib/supabase/server";
import type { Registration } from "@/types/database";

export async function authenticateToken(magic_token: string): Promise<Registration | null> {
  if (!magic_token) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("magic_token", magic_token)
    .single();

  if (error || !data) return null;
  return data as Registration;
}

export async function getActiveSession() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("watch_party_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}
