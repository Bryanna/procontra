export interface SupabaseServerConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

type Environment = Record<string, string | undefined>;

function required(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Falta la variable ${name}`);
  return value;
}

export function loadSupabaseConfig(env: Environment): SupabaseServerConfig {
  if (env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("La clave service_role no puede usar NEXT_PUBLIC_");
  }

  const url = required(env, "SUPABASE_URL");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL debe ser http(s)");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("SUPABASE_URL debe ser http(s)");
  }

  return {
    url: parsed.toString().replace(/\/$/, ""),
    anonKey: required(env, "SUPABASE_ANON_KEY"),
    serviceRoleKey: required(env, "SUPABASE_SERVICE_ROLE_KEY"),
  };
}
