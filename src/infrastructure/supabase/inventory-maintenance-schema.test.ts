import { readFileSync } from "node:fs";
import { join } from "node:path";

const path = join(process.cwd(), "supabase/migrations/0008_inventory_maintenance_catalogs.sql");

describe("inventory maintenance catalogs migration", () => {
  it("creates every tenant-scoped maintenance table and product relationship", () => {
    const sql = readFileSync(path, "utf8").toLowerCase();
    const tables = [
      "t_categorias_productos",
      "t_fabricantes_productos",
      "t_principios_activos",
      "t_unidades_medida",
      "t_formas_farmaceuticas",
      "t_vias_administracion",
    ];
    const tenantFields = ["f_id", "f_id_secuencia", "f_uuid", "f_email_principal", "f_rnc_principal", "f_idempresa", "f_idsucursal", "f_app"];
    for (const table of tables) {
      expect(sql).toContain(`create table if not exists api.${table}`);
      for (const field of tenantFields) expect(sql).toContain(field);
    }
    for (const relation of ["f_uuid_categoria", "f_uuid_fabricante", "f_uuid_principio_activo", "f_uuid_unidad_medida", "f_uuid_forma_farmaceutica", "f_uuid_via_administracion"]) {
      expect(sql).toContain(relation);
    }
    expect(sql).toContain("fn_crear_mantenimiento_inventario");
    expect(sql).toContain("fn_crear_producto_inventario_relacional");
  });
});
