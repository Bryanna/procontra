import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("patient today filter migration", () => {
  it("filters registrations using the Dominican Republic calendar day", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/0020_patient_today_filter.sql"), "utf8").toLowerCase();
    expect(sql).toContain("when 'today'");
    expect(sql).toContain("america/santo_domingo");
    expect(sql).toContain("f_creado_en");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});