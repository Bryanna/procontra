import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { loadSupabaseConfig } from "./config";

export async function createSupabaseSessionClient() {
  const cookieStore = await cookies();
  const config = loadSupabaseConfig(process.env);

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.PROCONTRA_COOKIE_SECURE === "true",
            });
          });
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes them.
        }
      },
    },
  });
}
