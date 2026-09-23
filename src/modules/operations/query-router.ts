export type InternalQueryIntent =
  | "product_availability"
  | "branch_stockouts"
  | "today_followups"
  | "management_report"
  | "transfer_suggestions"
  | "unsupported";

function normalize(query: string) {
  return query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function classifyInternalQuery(query: string): InternalQueryIntent {
  const text = normalize(query);
  if (/donde.*disponible|disponibilidad.*producto/.test(text)) return "product_availability";
  if (/agotad/.test(text)) return "branch_stockouts";
  if (/quien.*seguimiento|seguimiento.*hoy/.test(text)) return "today_followups";
  if (/reporte.*jimenez|resumen.*direccion/.test(text)) return "management_report";
  if (/traslad|transfer/.test(text)) return "transfer_suggestions";
  return "unsupported";
}
