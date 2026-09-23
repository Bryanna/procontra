import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const client = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profiles, error: profileError } = await client
  .schema("api")
  .from("t_perfiles")
  .select("f_idempresa,f_idsucursal,f_app")
  .eq("f_activo", true)
  .limit(1);
if (profileError || !profiles?.[0]) throw new Error(profileError?.message ?? "No active profile tenant found");
const tenant = profiles[0];

const { data: branches, error: branchError } = await client
  .schema("api")
  .from("t_sucursales")
  .select("f_codigo")
  .eq("f_idempresa", tenant.f_idempresa)
  .eq("f_app", tenant.f_app)
  .eq("f_activo", true)
  .order("f_codigo")
  .limit(1);
if (branchError || !branches?.[0]) throw new Error(branchError?.message ?? "No inventory branch found");

async function query({ search = "", filter = "all", branch = "" } = {}) {
  const { data, error } = await client.schema("api").rpc("fn_consultar_inventario", {
    p_empresa: tenant.f_idempresa,
    p_sucursal: tenant.f_idsucursal,
    p_app: tenant.f_app,
    p_busqueda: search,
    p_filtro: filter,
    p_codigo_sucursal: branch,
    p_limite: 25,
    p_desplazamiento: 0,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

const initial = await query();
if (initial.length === 0) throw new Error("Inventory query returned no products");
const searchTerm = (initial[0].f_nombre || initial[0].f_codigo).slice(0, 6).trim();
const searched = await query({ search: searchTerm });
if (searched.length === 0 || searched.some((row) => !`${row.f_codigo} ${row.f_nombre} ${row.f_presentacion ?? ""}`.toLocaleLowerCase("es").includes(searchTerm.toLocaleLowerCase("es")))) {
  throw new Error("Product search returned an invalid result set");
}

const expectedStatuses = {
  with_stock: new Set(["available", "low_stock"]),
  low_stock: new Set(["low_stock"]),
  out_of_stock: new Set(["out_of_stock"]),
  without_data: new Set(["no_data"]),
};
const filterCounts = {};
for (const [filter, statuses] of Object.entries(expectedStatuses)) {
  const rows = await query({ filter });
  if (rows.some((row) => !statuses.has(row.f_estado))) {
    throw new Error(`Filter ${filter} returned an unexpected stock status`);
  }
  filterCounts[filter] = Number(rows[0]?.f_total_registros ?? 0);
}

const branchRows = await query({ branch: branches[0].f_codigo });
console.log(JSON.stringify({
  initialRows: initial.length,
  searchTerm,
  searchMatches: Number(searched[0]?.f_total_registros ?? 0),
  filterCounts,
  testedBranch: branches[0].f_codigo,
  branchRows: branchRows.length,
}, null, 2));
