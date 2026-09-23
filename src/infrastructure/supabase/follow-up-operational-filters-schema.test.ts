import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/0021_follow_up_operational_filters.sql"), "utf8").toLowerCase();

describe("follow-up operational filters", () => {
  it("filters today's, overdue and upcoming contacts in the pharmacy timezone", () => {
    expect(sql).toContain("america/santo_domingo");
    expect(sql).toContain("'contact_today'");
    expect(sql).toContain("'overdue'");
    expect(sql).toContain("'next_7_days'");
    expect(sql).toContain("interval '7 days'");
  });

  it("reloads the API schema after replacing the query function", () => {
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});