import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

it("serves Continuidad from the operational follow-up workspace", () => {
  const route = resolve(process.cwd(), "src/app/continuidad/page.tsx");
  expect(existsSync(route)).toBe(true);
  const source = readFileSync(route, "utf8");
  expect(source).toContain('from "../programa/page"');
  expect(source).not.toContain("ModuleOverview");
});
