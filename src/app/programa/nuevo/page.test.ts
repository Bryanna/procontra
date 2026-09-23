import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/programa/nuevo/page.tsx"), "utf8");

describe("new follow-up program page", () => {
  it("is a protected write route that renders the interactive prescription workspace", () => {
    expect(source).toContain('can(role, "continuity:write")');
    expect(source).toContain('redirect("/sin-acceso")');
    expect(source).toContain('from "@/components/new-plan-workspace"');
    expect(source).toContain("<NewPlanWorkspace");
    expect(source).toContain('cancelHref="/programa"');
    expect(source).toContain("actorLabel=");
    expect(source).toContain("branchLabel=");
    expect(source).toContain("pageSize: 8");
  });
});
