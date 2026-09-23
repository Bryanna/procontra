import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/0022_follow_up_three_day_window.sql"), "utf8");

describe("follow-up three-day operational window migration", () => {
  it("uses the Dominican Republic business date and a three-day upcoming queue", () => {
    expect(sql).toContain("America/Santo_Domingo");
    expect(sql).toContain("next_3_days");
    expect(sql).toContain("interval '3 days'");
    expect(sql).toContain("f_proximos_3_dias");
    expect(sql).not.toContain("next_7_days");
  });
});
