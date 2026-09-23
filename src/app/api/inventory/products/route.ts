import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { listInventoryBranches } from "@/modules/inventory/inventory-repository";
import { prepareProductCreate } from "@/modules/inventory/product-management";
import { inventoryApiError, requireInventoryWrite } from "../inventory-api";

export async function POST(request: Request) {
  const auth = await requireInventoryWrite();
  if ("response" in auth) return auth.response;
  try {
    const branches = await listInventoryBranches(auth.tenant);
    const input = prepareProductCreate(
      await request.json(),
      branches.map((branch) => branch.id),
    );
    const { data, error } = await getSupabaseAdmin().schema("api").rpc("fn_crear_producto_inventario_relacional", {
      p_actor_uuid: auth.actorId,
      p_codigo: input.code,
      p_nombre: input.name,
      p_presentacion: input.presentation,
      p_codigo_barras: input.barcode,
      p_uuid_categoria: input.categoryId,
      p_uuid_fabricante: input.manufacturerId,
      p_uuid_principio_activo: input.activeIngredientId,
      p_uuid_unidad_medida: input.unitOfMeasureId,
      p_uuid_forma_farmaceutica: input.dosageFormId,
      p_uuid_via_administracion: input.administrationRouteId,
      p_registro_sanitario: input.sanitaryRegistration,
      p_requiere_receta: input.prescriptionRequired,
      p_posiciones: input.positions,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) {
    return inventoryApiError(error);
  }
}
