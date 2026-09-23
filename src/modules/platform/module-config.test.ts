import { getModuleConfig, moduleConfigs } from "./module-config";

describe("platform module configuration", () => {
  it("defines every dashboard option as an operational module", () => {
    expect(moduleConfigs.map((module) => module.slug)).toEqual([
      "pacientes",
      "documentos",
      "dispensaciones",
      "inventario",
      "continuidad",
      "reservas",
      "mensajeria",
      "reportes",
      "administracion",
    ]);
  });

  it("resolves known modules and rejects unknown routes", () => {
    expect(getModuleConfig("inventario")?.title).toBe("Inventario");
    expect(getModuleConfig("desconocido")).toBeNull();
  });
});
