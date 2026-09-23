import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { loadSupabaseConfig } from "./config";

let adminClient: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const config = loadSupabaseConfig(process.env);
    adminClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}
