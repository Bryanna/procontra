import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { inventoryApiError, requireInventoryWrite } from "../inventory-api";

const types = new Set(["category", "manufacturer", "activeIngredient", "unit", "dosageForm", "route"]);
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  const auth = await requireInventoryWrite();
  if ("response" in auth) return auth.response;
  try {
    const raw = await request.json() as Record<string, unknown>;
    const type = text(raw.type);
    const code = text(raw.code);
    const name = text(raw.name);
    const description = text(raw.description);
    if (!types.has(type)) throw new Error("Tipo de mantenimiento inválido");
    if (name.length < 2 || name.length > 200) throw new Error("Nombre de mantenimiento inválido");
    if (code.length > 60 || description.length > 500) throw new Error("Datos de mantenimiento inválidos");
    const { data, error } = await getSupabaseAdmin().schema("api").rpc("fn_crear_mantenimiento_inventario", {
      p_actor_uuid: auth.actorId, p_tipo: type, p_codigo: code || null, p_nombre: name, p_descripcion: description || null,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) {
    return inventoryApiError(error);
  }
}
