"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CalendarDays, ChevronDown, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronUp, RotateCcw, Search, UserRound, UsersRound } from "lucide-react";
import type { InventoryBranch } from "@/modules/inventory/inventory-catalog";
import type { PatientFilter, PatientSearchResult, PatientSummary } from "@/modules/patients/patient-catalog";
import { NewPatientDialog } from "./new-patient-dialog";
import { EditPatientDialog } from "./edit-patient-dialog";
import { formatPhoneNumber } from "@/shared/contact-format";

function patientsUrl(input: { query: string; filter: PatientFilter; branch: string; page: number }) {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.filter !== "today") params.set("status", input.filter);
  if (input.branch) params.set("branch", input.branch);
  if (input.page > 1) params.set("page", String(input.page));
  const suffix = params.toString();
  return suffix ? `/pacientes?${suffix}` : "/pacientes";
}

function patientInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
}

function paginationPages(page: number, totalPages: number) {
  const first = Math.max(1, Math.min(page - 2, totalPages - 4));
  const last = Math.min(totalPages, first + 4);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
}

export function PatientsWorkspace({
  summary,
  query,
  result,
  branches,
  filter,
  branch,
  canWrite = false,
}: {
  summary: PatientSummary;
  query: string;
  result: PatientSearchResult;
  branches: InventoryBranch[];
  filter: PatientFilter;
  branch: string;
  canWrite?: boolean;
}) {
  const router = useRouter();
  const replace = router.replace;
  const [searchQuery, setSearchQuery] = useState(query);
  const [selectedFilter, setSelectedFilter] = useState(filter);
  const [selectedBranch, setSelectedBranch] = useState(branch);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [renderedResult, setRenderedResult] = useState(result);
  const [showMetrics, setShowMetrics] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientSearchResult["items"][number] | null>(null);

  if (renderedResult !== result) {
    setRenderedResult(result);
    setSearchQuery(query);
    setSelectedFilter(filter);
    setSelectedBranch(branch);
    setIsTableLoading(false);
  }

  useEffect(() => {
    const normalized = searchQuery.trim();
    if (normalized === query.trim()) return;
    const timer = window.setTimeout(() => {
      setIsTableLoading(true);
      replace(patientsUrl({ query: normalized, filter: selectedFilter, branch: selectedBranch, page: 1 }), { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery, query, selectedFilter, selectedBranch, replace]);

  function replaceQuery(nextFilter: PatientFilter, nextBranch: string) {
    setIsTableLoading(true);
    router.replace(patientsUrl({ query: searchQuery.trim(), filter: nextFilter, branch: nextBranch, page: 1 }), { scroll: false });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsTableLoading(true);
    router.replace(patientsUrl({ query: searchQuery.trim(), filter: selectedFilter, branch: selectedBranch, page: 1 }), { scroll: false });
  }

  function clearFilters() {
    setSearchQuery("");
    setSelectedFilter("today");
    setSelectedBranch("");
    setIsTableLoading(true);
    router.replace("/pacientes", { scroll: false });
  }

  return (
    <div className="page-stack patients-workspace">
      <section className="page-heading">
        <div>
          <p className="eyebrow">GESTIÓN DE PACIENTES</p>
          <h1>Consulta de pacientes</h1>
          <p className="page-description">Consulte perfiles, consentimiento y seguimiento de continuidad con información persistida en el servidor.</p>
        </div>
        <div className="heading-actions">
          <button aria-controls="patient-metrics" aria-expanded={showMetrics} className="button button-secondary" onClick={() => setShowMetrics((current) => !current)} type="button">{showMetrics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{showMetrics ? "Ocultar métricas" : "Mostrar métricas"}</button>
          {canWrite && <NewPatientDialog branches={branches} />}
        </div>
      </section>

      {showMetrics && <section className="module-metric-grid patients-metric-grid" id="patient-metrics" aria-label="Resumen de pacientes">
        <button aria-pressed={selectedFilter === "all"} className="module-metric-card patient-metric-button" onClick={() => { setSelectedFilter("all"); replaceQuery("all", selectedBranch); }} type="button"><i className="module-metric-accent module-metric-blue" /><span><small>Todos los pacientes</small><strong>{summary.totalPatients.toLocaleString("en-US")}</strong></span></button>
        <button aria-pressed={selectedFilter === "active"} className="module-metric-card patient-metric-button" onClick={() => { setSelectedFilter("active"); replaceQuery("active", selectedBranch); }} type="button"><i className="module-metric-accent module-metric-emerald" /><span><small>Pacientes activos</small><strong>{summary.activePatients.toLocaleString("en-US")}</strong></span></button>
        <button aria-pressed={selectedFilter === "inactive"} className="module-metric-card patient-metric-button" onClick={() => { setSelectedFilter("inactive"); replaceQuery("inactive", selectedBranch); }} type="button"><i className="module-metric-accent module-metric-rose" /><span><small>Pacientes inactivos</small><strong>{summary.inactivePatients.toLocaleString("en-US")}</strong></span></button>
        <button aria-pressed={selectedFilter === "with_consent"} className="module-metric-card patient-metric-button" onClick={() => { setSelectedFilter("with_consent"); replaceQuery("with_consent", selectedBranch); }} type="button"><i className="module-metric-accent module-metric-emerald" /><span><small>Consentimientos vigentes</small><strong>{summary.currentConsents.toLocaleString("en-US")}</strong></span></button>
        <button aria-pressed={selectedFilter === "without_consent"} className="module-metric-card patient-metric-button" onClick={() => { setSelectedFilter("without_consent"); replaceQuery("without_consent", selectedBranch); }} type="button"><i className="module-metric-accent module-metric-amber" /><span><small>Sin consentimiento vigente</small><strong>{summary.withoutCurrentConsent.toLocaleString("en-US")}</strong></span></button>
      </section>}

      <section className="panel patients-list-panel">
        <form action="/pacientes" autoComplete="off" className="patients-query-form" method="get" onSubmit={submitSearch} role="search">
          <label className="patients-query-search"><Search size={18} /><input aria-label="Buscar paciente" autoComplete="off" name="patient-query" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Nombre, código, teléfono, cédula, carnet o aseguradora…" spellCheck={false} type="search" value={searchQuery} /></label>
          <label className="patients-filter-field"><span><UserRound size={14} /> Vista</span><select aria-label="Filtrar pacientes por estado" name="status" onChange={(event) => { const next = event.target.value as PatientFilter; setSelectedFilter(next); replaceQuery(next, selectedBranch); }} value={selectedFilter}><option value="today">Registrados hoy</option><option value="all">Todos los pacientes</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="with_consent">Con consentimiento</option><option value="without_consent">Sin consentimiento vigente</option></select></label>
          <label className="patients-filter-field"><span><Building2 size={14} /> Sucursal</span><select aria-label="Filtrar pacientes por sucursal" name="branch" onChange={(event) => { const next = event.target.value; setSelectedBranch(next); replaceQuery(selectedFilter, next); }} value={selectedBranch}><option value="">Todas las sucursales</option>{branches.map((item) => <option key={item.id} value={item.code}>{item.name} {item.code}</option>)}</select></label>
          <button aria-label="Limpiar filtros de pacientes" className="button button-secondary patients-reset" disabled={isTableLoading} onClick={clearFilters} type="button"><RotateCcw size={15} /></button>
        </form>

        <div aria-busy={isTableLoading} aria-label="Pacientes registrados" className="patients-live-table" role="table">
          <div className="patients-live-row patients-live-header" role="row"><span role="columnheader">Paciente</span><span role="columnheader">Contacto</span><span role="columnheader">Aseguradora</span><span role="columnheader">Sucursal</span><span role="columnheader">Estado</span></div>
          {isTableLoading ? (
            <div aria-label="Cargando pacientes" className="patients-table-skeleton" role="status">
              {Array.from({ length: 8 }, (_, rowIndex) => <div className="patients-live-row patients-skeleton-row" data-testid="patient-skeleton-row" key={rowIndex}>{Array.from({ length: 5 }, (_, cellIndex) => <span className="skeleton-line" key={cellIndex} />)}</div>)}
            </div>
          ) : result.items.length === 0 ? (
            <div className="patients-empty-state"><UsersRound size={30} /><strong>{selectedFilter === "today" ? "No hay pacientes registrados hoy" : "No encontramos pacientes"}</strong><span>{selectedFilter === "today" ? "Los pacientes registrados durante el día aparecerán aquí automáticamente." : "Pruebe otro término o limpie los filtros aplicados. Los registros nuevos aparecerán desde el servidor."}</span></div>
          ) : result.items.map((patient) => (
            <div aria-label={`${patient.name} ${patient.code}`} className={`patients-live-row${canWrite ? " patients-editable-row" : ""}`} onDoubleClick={() => { if (canWrite) setEditingPatient(patient); }} onKeyDown={(event) => { if (canWrite && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setEditingPatient(patient); } }} role="row" tabIndex={canWrite ? 0 : undefined} title={canWrite ? "Doble clic para editar" : undefined} key={patient.id}>
              {canWrite ? <span className="patients-name-cell" data-label="Paciente"><i>{patientInitials(patient.name)}</i><span className="table-cell-stack"><strong>{patient.name}</strong><small>{patient.code}</small></span></span> : <Link className="patients-name-cell" data-label="Paciente" href={`/pacientes/${patient.id}`}><i>{patientInitials(patient.name)}</i><span className="table-cell-stack"><strong>{patient.name}</strong><small>{patient.code}</small></span></Link>}
              <span className="patients-contact-cell table-cell-stack" data-label="Contacto"><strong>{formatPhoneNumber(patient.phone)}</strong><small>{[patient.governmentIdMask ? `Cédula ${patient.governmentIdMask}` : "", patient.insuranceCardMask ? `Carnet ${patient.insuranceCardMask}` : ""].filter(Boolean).join(" · ") || "Identificación no informada"}</small></span>
              <span className="patients-text-cell" data-label="Aseguradora">{patient.insurer || "No informada"}</span>
              <span className="patients-text-cell" data-label="Sucursal">{patient.branch ? `${patient.branch}${patient.branchCode ? ` ${patient.branchCode}` : ""}` : "Sin sucursal preferida"}</span>
              <span className="patients-status-cell" data-label="Estado"><span className={`status ${patient.active ? "status-emerald" : "status-slate"}`}>{patient.active ? "Activo" : "Inactivo"}</span></span>
            </div>
          ))}
        </div>

        <div className="table-footer patients-pagination-footer">
          <div className="patients-pagination-summary"><span className="patients-record-count"><CalendarDays size={15} />{selectedFilter === "today" ? `${result.total.toLocaleString("en-US")} ${result.total === 1 ? "paciente registrado hoy" : "pacientes registrados hoy"}` : `${result.total.toLocaleString("en-US")} ${result.total === 1 ? "registro" : "registros"}`}</span><small><span>Página {result.page} de {result.totalPages}</span><i /><span>{result.pageSize} por página</span></small></div>
          {isTableLoading ? <div aria-hidden="true" className="patients-pagination-skeleton" data-testid="patient-pagination-skeleton"><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /></div> : <nav aria-label="Paginación de pacientes" className="patients-pagination">
            {result.page > 1 && <><Link aria-label="Primera página" className="patients-page-edge" href={patientsUrl({ query, filter, branch, page: 1 })} onClick={() => setIsTableLoading(true)}><ChevronsLeft size={16} /></Link><Link aria-label="Anterior" className="patients-page-direction" href={patientsUrl({ query, filter, branch, page: result.page - 1 })} onClick={() => setIsTableLoading(true)}><ChevronLeft size={15} /><span>Anterior</span></Link></>}
            <span className="patients-page-numbers">
              {paginationPages(result.page, result.totalPages).map((page) => page === result.page
                ? <span aria-current="page" className="patients-page-current" key={page}>{page}</span>
                : <Link aria-label={`Página ${page}`} href={patientsUrl({ query, filter, branch, page })} key={page} onClick={() => setIsTableLoading(true)}>{page}</Link>)}
            </span>
            {result.page < result.totalPages && <><Link aria-label="Siguiente" className="patients-page-direction" href={patientsUrl({ query, filter, branch, page: result.page + 1 })} onClick={() => setIsTableLoading(true)}><span>Siguiente</span><ArrowRight size={15} /></Link><Link aria-label="Última página" className="patients-page-edge" href={patientsUrl({ query, filter, branch, page: result.totalPages })} onClick={() => setIsTableLoading(true)}><ChevronsRight size={16} /></Link></>}
          </nav>}
        </div>
      </section>
      {editingPatient && <EditPatientDialog branches={branches} onClose={() => setEditingPatient(null)} patient={editingPatient} />}
    </div>
  );
}
