import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("application typography", () => {
  it("slightly enlarges text throughout the complete application", () => {
    expect(css).toMatch(/body\s*\{[\s\S]*?font-size-adjust:\s*0\.56;/);
  });

  it("uses a readable two-line table pattern and responsive patient cards", () => {
    expect(css).toMatch(/\.patients-live-row\s*\{[\s\S]*?font-size:\s*14px;/);
    expect(css).toMatch(/\.patients-live-row small\s*\{[\s\S]*?font-size:\s*12px;/);
    expect(css).toMatch(/\.table-cell-stack\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*4px;/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*?\.patients-live-row:not\(\.patients-live-header\)\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
  });

  it("keeps patient metrics compact and the registration dialog operationally grouped", () => {
    expect(css).toMatch(/\.patients-metric-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5,minmax\(0,1fr\)\)/);
    expect(css).toMatch(/\.patient-metric-button\s*\{[\s\S]*?min-height:\s*76px;/);
    expect(css).toMatch(/\.patient-registration-scope\s*\{[\s\S]*?display:\s*grid;/);
    expect(css).toMatch(/\.patient-dialog-footer\s*\{[^}]*position:\s*sticky/i);
    expect(css).toMatch(/\.patients-editable-row\s*\{[^}]*cursor:\s*pointer/i);
    expect(css).toMatch(/\.patients-editable-row:focus-visible\s*\{[^}]*outline/i);
    expect(css).toMatch(/\.patients-pagination-summary\s*\{[^}]*display:\s*grid/i);
    expect(css).toMatch(/\.patients-pagination-skeleton\s*\{[^}]*display:\s*flex/i);
  });

  it("presents logout confirmation as a branded responsive modal", () => {
    expect(css).toMatch(/\.logout-confirmation\s*\{[^}]*position:\s*fixed[^}]*z-index:/i);
    expect(css).toMatch(/\.logout-confirmation-card\s*\{[^}]*border-radius:[^}]*box-shadow:/i);
    expect(css).toMatch(/\.logout-confirmation-logo\s*\{[^}]*width:\s*76px[^}]*height:\s*76px/i);
    expect(css).toMatch(/\.logout-confirmation-actions\s*\{[^}]*display:\s*grid/i);
  });

  it("gives the follow-up worklist patient-style filters, skeletons and pagination", () => {
    expect(css).toMatch(/\.followup-summary-filter\s*\{[^}]*cursor:\s*pointer/i);
    expect(css).toMatch(/\.followup-table-skeleton\s*\{[^}]*display:\s*table-row-group/i);
    expect(css).toMatch(/\.followup-pagination-summary\s*\{[^}]*display:\s*grid/i);
    expect(css).toMatch(/\.followup-pagination-skeleton\s*\{[^}]*display:\s*flex/i);
  });

  it("renders prescription registration as a responsive four-step operational workspace", () => {
    expect(css).toMatch(/\.followup-registration-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\) minmax\(300px,360px\)/i);
    expect(css).toMatch(/\.followup-registration-summary\s*\{[^}]*position:\s*sticky/i);
    expect(css).toMatch(/\.followup-registration-step\[aria-current="step"\]|\.followup-registration-stepper button\[aria-current="step"\]/i);
    expect(css).toMatch(/\.followup-alert-channel-grid\s*\{[^}]*display:\s*grid/i);
    expect(css).toMatch(/\.followup-three-day-preview\s*\{[^}]*border-radius:/i);
    expect(css).toMatch(/@media \(max-width:\s*600px\)[\s\S]*?\.followup-registration-actions\s*\{[^}]*position:\s*sticky/i);
  });
});
