import { classifyPatientMessage } from "./message-classifier";

describe("patient message classifier", () => {
  it("classifies operational replies and opt-out", () => {
    expect(classifyPatientMessage("Sí, deseo reservar en Esperanza")).toBe("reserve");
    expect(classifyPatientMessage("Todavía tengo medicamento para varios días")).toBe("still_has_supply");
    expect(classifyPatientMessage("SALIR")).toBe("opt_out");
  });

  it("routes clinical questions and possible emergencies to humans", () => {
    expect(classifyPatientMessage("¿Puedo cambiar la dosis?")).toBe("clinical_handoff");
    expect(classifyPatientMessage("Tengo dificultad para respirar")).toBe("emergency_handoff");
  });
});
