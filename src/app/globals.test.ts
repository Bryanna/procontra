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

  it("isolates Programa colors and interaction states between light and dark themes", () => {
    expect(css).toMatch(/\.followup-page\s*\{[^}]*--followup-accent:\s*#0e667d;[^}]*--followup-on-accent:\s*#fff;[^}]*--followup-shimmer:/i);
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.followup-page\s*\{[^}]*--followup-accent:\s*#75c5d8;[^}]*--followup-on-accent:\s*#06171c;[^}]*--followup-shimmer:/i);
    expect(css).toMatch(/\.followup-action\s*\{[^}]*color:\s*var\(--followup-accent\)[^}]*background:\s*color-mix/i);
    expect(css).toMatch(/\.followup-btn-primary\s*\{[^}]*color:\s*var\(--followup-on-accent\)[^}]*background:\s*var\(--followup-accent\)/i);
    expect(css).toMatch(/\.followup-skeleton-line::after[^}]*background:\s*linear-gradient\([^}]*var\(--followup-shimmer\)/i);
    expect(css).toMatch(/\.followup-modal-card\s*\{[^}]*border-color:\s*var\(--line-strong\)/i);
    expect(css).toMatch(/\.followup-status-active\s*\{[^}]*color:\s*var\(--followup-success-ink\)/i);
    expect(css).toMatch(/\.followup-status-paused\s*\{[^}]*color:\s*var\(--followup-warning-ink\)/i);
    expect(css).toMatch(/\.followup-page\s+\.form-error\s*\{[^}]*color:\s*var\(--followup-danger-ink\)/i);
  });

  it("lays out document authorization review for desktop and phone operation", () => {
    expect(css).toMatch(/\.authorization-fields\s*\{[^}]*grid-template-columns:/i);
    expect(css).toMatch(/\.authorization-confirmations\s*\{[^}]*display:\s*grid/i);
    expect(css).toMatch(/\.authorization-confirmations label\s*\{[^}]*min-height:\s*44px/i);
    expect(css).toMatch(/\.authorization-line-editor\s*\{[^}]*grid-template-columns:/i);
    expect(css).toMatch(/@media \(max-width:\s*680px\)[\s\S]*?\.authorization-confirmations\s*\{[^}]*grid-template-columns:\s*1fr/i);
  });

  it("renders prescription registration as a responsive four-step operational workspace", () => {
    expect(css).not.toMatch(/\.followup-registration-header/);
    expect(css).toMatch(/\.followup-prescription-heading\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*auto minmax\(0,1fr\) auto/i);
    expect(css).toMatch(/\.followup-back-icon\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/i);
    expect(css).toMatch(/\.followup-registration-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\) minmax\(300px,360px\)/i);
    expect(css).toMatch(/\.followup-registration-summary\s*\{[^}]*position:\s*sticky/i);
    expect(css).toMatch(/\.followup-registration-step\[aria-current="step"\]|\.followup-registration-stepper button\[aria-current="step"\]/i);
    expect(css).toMatch(/\.followup-alert-channel-grid\s*\{[^}]*display:\s*grid/i);
    expect(css).toMatch(/\.followup-three-day-preview\s*\{[^}]*border-radius:/i);
    expect(css).toMatch(/@media \(max-width:\s*600px\)[\s\S]*?\.followup-registration-actions\s*\{[^}]*position:\s*sticky/i);
  });
});
