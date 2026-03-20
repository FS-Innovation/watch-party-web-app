import { createClient } from "@supabase/supabase-js";

// Untyped client for admin operations where we need flexible updates
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
