import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("follow-up timeline API", () => {
  it("reads a tenant-scoped timeline and resolves operator-facing traceability", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/follow-up/plans/[id]/timeline/route.ts"), "utf8");
    const repository = readFileSync(join(process.cwd(), "src/modules/follow-up/follow-up-repository.ts"), "utf8");
    const migration = readFileSync(join(process.cwd(), "supabase/migrations/0023_prescription_centered_follow_up.sql"), "utf8");
    const auth = readFileSync(join(process.cwd(), "src/app/api/follow-up/follow-up-api.ts"), "utf8");
    expect(route).toContain("requireFollowUpRead");
    expect(route).toContain("t_perfiles");
    expect(route).toContain("f_nombre_mostrar");
    expect(route).toContain("title:");
    expect(route).toContain("nextActionDate:");
    expect(repository).toContain("fn_historial_plan_seguimiento");
    expect(repository).toContain("p_empresa: tenant.companyId");
    expect(repository).toContain("p_app: tenant.appId");
    expect(migration).toContain("t_contactos_seguimiento");
    expect(migration).toContain("plan_registered");
    expect(auth).toContain('"continuity:read"');
  });
});
