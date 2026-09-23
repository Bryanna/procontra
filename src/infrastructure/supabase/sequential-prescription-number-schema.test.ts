import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/0024_sequential_prescription_number.sql"), "utf8").toLowerCase();

describe("numeración secuencial de recetas", () => {
  it("asigna RECETA-año-secuencia con seis dígitos desde la base de datos", () => {
    expect(sql).toContain("before insert on api.t_planes_seguimiento");
    expect(sql).toContain("new.f_id_secuencia");
    expect(sql).toContain("'receta-'");
    expect(sql).toContain("america/santo_domingo");
    expect(sql).toMatch(/lpad\([^)]*f_id_secuencia[^)]*,\s*6,\s*'0'\)/);
    expect(sql).toContain("unique index");
  });
});