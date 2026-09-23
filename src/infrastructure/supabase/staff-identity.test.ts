import { buildStaffView } from "./staff-identity";

describe("staff identity repository", () => {
  it("maps an active profile and assigned branches", () => {
    expect(buildStaffView(
      { f_nombre_mostrar: "Encargado Inventario", f_rol: "inventory", f_activo: true },
      [
        { f_uuid_sucursal: "branch-70", t_sucursales: { f_codigo: "70", f_nombre: "Esperanza" } },
        { f_uuid_sucursal: "branch-01", t_sucursales: { f_codigo: "01", f_nombre: "Amina" } },
      ],
    )).toEqual({
      displayName: "Encargado Inventario",
      role: "inventory",
      branches: [
        { id: "branch-01", code: "01", name: "Amina" },
        { id: "branch-70", code: "70", name: "Esperanza" },
      ],
    });
  });

  it("rejects inactive profiles and unknown roles", () => {
    expect(buildStaffView(
      { f_nombre_mostrar: "Inactivo", f_rol: "inventory", f_activo: false },
      [],
    )).toBeNull();
    expect(buildStaffView(
      { f_nombre_mostrar: "Desconocido", f_rol: "root", f_activo: true },
      [],
    )).toBeNull();
  });
});
