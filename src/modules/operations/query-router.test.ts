import { classifyInternalQuery } from "./query-router";

describe("internal assistant query router", () => {
  it("routes the five operational requests defined in the PDF", () => {
    expect(classifyInternalQuery("¿Dónde está disponible este producto?")).toBe("product_availability");
    expect(classifyInternalQuery("Muéstrame los agotados de Amina")).toBe("branch_stockouts");
    expect(classifyInternalQuery("¿Quién necesita seguimiento hoy?")).toBe("today_followups");
    expect(classifyInternalQuery("Prepara el reporte para el Dr. Jiménez")).toBe("management_report");
    expect(classifyInternalQuery("¿Qué debemos trasladar a Jaibón?")).toBe("transfer_suggestions");
  });
});
