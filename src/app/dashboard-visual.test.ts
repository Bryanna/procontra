import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const dashboardCss = css.slice(css.indexOf(".metric-grid {"), css.indexOf("/* Module workspaces */"));

describe("legibilidad visual del dashboard", () => {
  it("aumenta textos, cifras y objetos operativos", () => {
    expect(dashboardCss).toMatch(/\.metric-card\s*\{[^}]*min-height:\s*132px/);
    expect(dashboardCss).toMatch(/\.metric-icon\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/);
    expect(dashboardCss).toMatch(/\.metric-label\s*\{[^}]*font-size:\s*13px/);
    expect(dashboardCss).toMatch(/\.metric-value\s*\{[^}]*font-size:\s*32px/);
    expect(dashboardCss).toMatch(/\.metric-change\s*\{[^}]*font-size:\s*12px/);
    expect(dashboardCss).toMatch(/\.priority-row,[\s\S]*?\.module-row\s*\{[^}]*min-height:\s*64px[^}]*font-size:\s*13px/);
    expect(dashboardCss).toMatch(/\.status\s*\{[^}]*min-height:\s*30px[^}]*font-size:\s*11px/);
    expect(dashboardCss).toMatch(/\.stock-item button\s*\{[^}]*min-height:\s*44px[^}]*font-size:\s*12px/);
    expect(dashboardCss).toMatch(/\.activity-list strong\s*\{[^}]*font-size:\s*13px/);
    expect(dashboardCss).toMatch(/\.activity-list span\s*\{[^}]*font-size:\s*12px/);
  });
});
