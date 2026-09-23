import { loadSupabaseConfig } from "./config";

describe("Supabase server configuration", () => {
  it("loads the local server-only connection variables", () => {
    expect(loadSupabaseConfig({
      SUPABASE_URL: "http://127.0.0.1:8000",
      SUPABASE_ANON_KEY: "anon-test-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-test-key",
    })).toEqual({
      url: "http://127.0.0.1:8000",
      anonKey: "anon-test-key",
      serviceRoleKey: "service-test-key",
    });
  });

  it("rejects missing or public service-role credentials", () => {
    expect(() => loadSupabaseConfig({
      SUPABASE_URL: "http://127.0.0.1:8000",
      SUPABASE_ANON_KEY: "anon-test-key",
    })).toThrow("SUPABASE_SERVICE_ROLE_KEY");

    expect(() => loadSupabaseConfig({
      SUPABASE_URL: "http://127.0.0.1:8000",
      SUPABASE_ANON_KEY: "anon-test-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-test-key",
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "must-never-exist",
    })).toThrow("service_role no puede usar NEXT_PUBLIC_");
  });

  it("requires an http or https Supabase URL", () => {
    expect(() => loadSupabaseConfig({
      SUPABASE_URL: "postgres://database",
      SUPABASE_ANON_KEY: "anon-test-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-test-key",
    })).toThrow("SUPABASE_URL debe ser http(s)");
  });
});
