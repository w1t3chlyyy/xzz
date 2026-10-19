import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceKey, safeSupabaseFetch } from "@/lib/supabase/config";

export function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    getSupabaseServiceKey(),
    {
      global: {
        fetch: safeSupabaseFetch,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
