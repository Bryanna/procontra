import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("staff administration migration", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/0003_staff_administration.sql"), "utf8");

  it("keeps profile, memberships and audit changes in database transactions", () => {
    expect(sql).toContain("create or replace function public.admin_create_staff_profile");
    expect(sql).toContain("create or replace function public.admin_update_staff_profile");
    expect(sql).toContain("insert into public.audit_events");
    expect(sql).toContain("No puede desactivar su propia cuenta");
  });

  it("permits only active administrators and prevents browser execution", () => {
    expect(sql.match(/role = 'administrator'/g)?.length).toBeGreaterThanOrEqual(2);
    expect(sql).toContain("revoke all on function public.admin_create_staff_profile");
    expect(sql).toContain("revoke all on function public.admin_update_staff_profile");
  });
});
