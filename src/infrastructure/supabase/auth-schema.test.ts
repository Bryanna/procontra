import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Supabase staff authentication schema", () => {
  it("provisions least-privilege profiles and protects branch memberships", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/0002_staff_auth.sql"),
      "utf8",
    );

    expect(sql).toContain("after insert on auth.users");
    expect(sql).toContain("'attention'");
    expect(sql).toContain("security definer");
    expect(sql).toContain('create policy "memberships read own"');
    expect(sql).toContain("profile_id = auth.uid()");
    expect(sql).toContain("revoke all on function public.handle_new_staff_user() from public");
  });
});
