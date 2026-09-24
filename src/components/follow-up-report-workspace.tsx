"use client";

import { CalendarClock, CheckCircle2, FileDown, PhoneCall, Search, ShieldAlert, TestTube2, UsersRound } from "lucide-react";
import type { FollowUpReportFilters, FollowUpReportResult } from "@/modules/reporting/follow-up-report-repository";
import { formatPhoneNumber } from "@/shared/contact-format";

interface BranchOption { id: string; code: string; name: string }
interface Props { report: FollowUpReportResult; filters: FollowUpReportFilters; branches: BranchOption[] }

const dateFormatter = new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const formatDate = (value: string | null) => value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : "—";
const resultLabels: Record<string, string> = {
  sin_contacto: "Sin contacto", contesto: "Contestó", no_contesto: "No contestó", ya_tiene_receta: "Ya tiene receta",
  no_tiene_receta: "No tiene receta", tiene_cita_medica: "Tiene cita médica", esperando_autorizacion: "Esperando autorización",
  comprara_efectivo: "Comprará en efectivo", volver_a_llamar: "Volver a llamar", enviar_a_casa: "Enviar a casa", compro: "Compró",
};
const statusLabels: Record<string, string> = { active: "Activo", paused: "Suspendido", completed: "Completado", retired: "Retirado" };

function pageHref(filters: FollowUpReportFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.branchCode) params.set("branch", filters.branchCode);
  if (filters.result !== "all") params.set("result", filters.result);
  if (filters.dataScope !== "all") params.set("data", filters.dataScope);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/reportes?${query}` : "/reportes";
}

export function FollowUpReportWorkspace({ report, filters, branches }: Props) {
  const metrics = [
    ["Planes", report.summary.total, UsersRound], ["Contactar hoy", report.summary.contactToday, PhoneCall],
    ["Atrasados", report.summary.overdue, ShieldAlert], ["Próximos 7 días", report.summary.nextSevenDays, CalendarClock],
    ["Contactados", report.summary.contacted, CheckCircle2], ["No contestaron", report.summary.noAnswer, PhoneCall],
    ["Sin receta", report.summary.withoutPrescription, ShieldAlert], ["Completados", report.summary.completed, CheckCircle2],
  ] as const;
  return <div className="page-stack followup-page report-page">
    <section className="page-heading followup-heading report-heading">
      <div className="followup-heading-copy"><span className="followup-hero-icon"><CalendarClock size={24}/></span><div><p className="eyebrow">CONTROL DE USO CONTINUO</p><h1>Reporte de seguimiento</h1><p className="page-description">Consulte contactos, pendientes y resultados del plan por fecha y sucursal.</p></div></div>
      <div className="followup-heading-actions"><button className="followup-btn followup-btn-primary report-print-button" type="button" aria-label="Imprimir o guardar PDF" onClick={() => window.print()}><FileDown size={18}/>Imprimir / PDF</button></div>
    </section>

    <section className="followup-summary-grid report-summary-grid" aria-label="Indicadores del reporte">
      {metrics.map(([label, value, Icon]) => <article className="panel followup-summary-card" key={label}><Icon size={20}/><span><strong>{value}</strong><small>{label}</small></span></article>)}
    </section>

    <section className="panel followup-worklist report-worklist">
      <header className="followup-worklist-heading"><div><span className="eyebrow">CONSULTA OPERATIVA</span><h2>Seguimientos registrados</h2></div><span>{report.total} resultado{report.total === 1 ? "" : "s"}</span></header>
      <form className="followup-filters report-filters" method="get" action="/reportes">
        <label className="followup-search"><Search size={16}/><input aria-label="Buscar en reporte" name="q" defaultValue={filters.query} placeholder="Paciente, teléfono o medicamento…"/></label>
        <label><select aria-label="Filtrar por sucursal" name="branch" defaultValue={filters.branchCode}><option value="">Todas las sucursales</option>{branches.map((branch) => <option key={branch.id} value={branch.code}>{branch.name} {branch.code}</option>)}</select></label>
        <label><select aria-label="Filtrar por resultado" name="result" defaultValue={filters.result}><option value="all">Todos los resultados</option>{Object.entries(resultLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><select aria-label="Tipo de datos" name="data" defaultValue={filters.dataScope}><option value="all">Todos los datos</option><option value="test">Solo pruebas</option><option value="operational">Solo operativos</option></select></label>
        <label><input aria-label="Fecha inicial" name="from" type="date" defaultValue={filters.from}/></label>
        <label><input aria-label="Fecha final" name="to" type="date" defaultValue={filters.to}/></label>
        <button className="followup-btn followup-btn-secondary followup-filter-btn" type="submit">Generar reporte</button>
      </form>

      {report.items.length === 0 ? <div className="followup-empty"><CalendarClock size={28}/><strong>No hay seguimientos para estos filtros.</strong><span>Cambie el período o el tipo de datos para generar el reporte.</span></div> : <div className="followup-table-wrap"><table className="followup-table report-table" aria-label="Reporte de planes de seguimiento"><thead><tr><th>Paciente</th><th>Sucursal / ARS</th><th>Tratamiento</th><th>Fechas</th><th>Resultado</th><th>Estado / origen</th></tr></thead><tbody>{report.items.map((item) => <tr key={item.id}>
        <td data-label="Paciente"><strong>{item.patientName}</strong><span>{formatPhoneNumber(item.phone)}</span>{item.isTest && <small className="report-test-badge"><TestTube2 size={12}/>Datos de prueba</small>}</td>
        <td data-label="Sucursal / ARS"><strong>{item.branch ? `${item.branch} ${item.branchCode ?? ""}` : "Sin sucursal"}</strong><span>{item.insurer}</span></td>
        <td data-label="Tratamiento"><strong>{item.medicines}</strong><span>{item.doctor ?? "Médico no registrado"}</span></td>
        <td data-label="Fechas"><strong>Contacto: {formatDate(item.contactDate)}</strong><span>Próxima compra: {formatDate(item.nextPurchaseDate)}</span><small>Primera compra: {formatDate(item.firstPurchaseDate)}</small></td>
        <td data-label="Resultado"><strong>{item.lastResult ? resultLabels[item.lastResult] ?? item.lastResult : "Sin contacto"}</strong><span>{item.contactCount} contacto{item.contactCount === 1 ? "" : "s"} registrado{item.contactCount === 1 ? "" : "s"}</span></td>
        <td data-label="Estado / origen"><span className={`status followup-status-${item.status}`}>{statusLabels[item.status] ?? item.status}</span>{item.sourceReference && <small>{item.sourceReference}</small>}</td>
      </tr>)}</tbody></table></div>}
      {report.totalPages > 1 && <nav className="followup-pagination" aria-label="Paginación del reporte"><a aria-disabled={report.page <= 1} href={pageHref(filters, Math.max(1,report.page-1))}>Anterior</a><span>Página {report.page} de {report.totalPages}</span><a aria-disabled={report.page >= report.totalPages} href={pageHref(filters, Math.min(report.totalPages,report.page+1))}>Siguiente</a></nav>}
    </section>
  </div>;
}
