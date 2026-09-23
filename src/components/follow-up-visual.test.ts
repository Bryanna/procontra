import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const followUpV2 = css.slice(css.indexOf("/* Follow-up visual system v2 */"));

describe("calidad visual del plan de seguimiento", () => {
  it("da a todos los botones un área táctil y estados perceptibles", () => {
    expect(followUpV2).toMatch(/\.followup-btn\s*\{[^}]*min-height:\s*44px/);
    expect(followUpV2).toContain(".followup-btn:hover");
    expect(followUpV2).toContain(".followup-btn:focus-visible");
    expect(followUpV2).toContain(".followup-btn:disabled");
  });

  it("presenta un modal elevado, legible y adaptable", () => {
    expect(followUpV2).toMatch(/\.followup-create-card\s*\{[^}]*width:\s*min\(900px/);
    expect(followUpV2).toMatch(/\.followup-modal-footer\s*\{[^}]*position:\s*sticky/);
    expect(followUpV2).toContain(".followup-modal-card,.followup-create-card,.followup-result-card { width: 100%");
  });

  it("convierte la tabla operativa en tarjetas sin desplazamiento horizontal en teléfonos", () => {
    expect(followUpV2).toContain("@media (max-width: 760px)");
    expect(followUpV2).toContain(".followup-table thead { display: none; }");
    expect(followUpV2).toMatch(/\.followup-table tr\s*\{[^}]*display:\s*grid/);
    expect(followUpV2).toContain(".followup-table td::before");
    expect(followUpV2).toContain("overflow-x: clip");
  });

  it("mantiene visible y accesible el buscador de pacientes", () => {
    expect(followUpV2).toMatch(/\.followup-patient-search\s*\{[^}]*min-height:\s*44px/);
    expect(followUpV2).toContain(".followup-patient-results");
    expect(followUpV2).toContain(".followup-selected-patient");
  });

  it("usa texto operativo legible en tabla y formularios", () => {
    expect(followUpV2).toMatch(/\.followup-table td > strong\s*\{[^}]*font-size:\s*11px/);
    expect(followUpV2).toMatch(/\.followup-form label\s*\{[^}]*font-size:\s*13px/);
    expect(followUpV2).toMatch(/\.followup-form input,\.followup-form select,\.followup-form textarea\s*\{[^}]*font-size:\s*14px/);
    expect(followUpV2).toMatch(/\.followup-form label > small\s*\{[^}]*font-size:\s*12px/);
    expect(followUpV2).toMatch(/\.followup-filters input,\.followup-filters select\s*\{[^}]*font-size:\s*13px/);
    expect(followUpV2).toMatch(/@media \(max-width: 700px\)[\s\S]*\.followup-form input,\.followup-form select,\.followup-form textarea\s*\{[^}]*font-size:\s*16px/);
  });
});
