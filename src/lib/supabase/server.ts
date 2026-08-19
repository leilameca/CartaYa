import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { withoutPersistence } from "@/lib/auth/session";
import type { Database } from "@/types/database";

export async function createClient({ sessionOnly = false }: { sessionOnly?: boolean } = {}) {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, sessionOnly ? withoutPersistence(options) : options),
          );
        } catch {
          // Server Components cannot write cookies. The middleware refreshes them.
        }
      },
    },
  });
}
