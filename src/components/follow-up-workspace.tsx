"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardPlus, Eye, EyeOff, Filter, HeartPulse, History, MessageCircle, Phone, Pill, RotateCcw, Search, ShieldCheck, X } from "lucide-react";
import { insurerRules } from "@/modules/follow-up/follow-up-rules";
import type { FollowUpPlan, FollowUpSearchResult, FollowUpStatus, FollowUpSummary } from "@/modules/follow-up/follow-up-repository";

interface BranchOption { id: string; code: string; name: string }

interface DispensableProduct { id: string; code: string; name: string; presentation: string | null; available: number; updatedAt: string | null }
interface TimelineItem { id: string; type: "plan_created" | "contact" | "purchase"; title: string; channel: string | null; result: string | null; observations: string | null; nextActionDate: string | null; actor: string | null; occurredAt: string }

interface FollowUpWorkspaceProps {
  query: string;
  status: FollowUpStatus;
  insurerCode: string;
  branchCode: string;
  branches: BranchOption[];
  result: FollowUpSearchResult;
  summary: FollowUpSummary;
  canWrite: boolean;
  canDispense: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const formatDate = (value: string | null) => value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : "—";
const resultLabels: Record<string, string> = {
  contesto: "Contestó", no_contesto: "No contestó", ya_tiene_receta: "Ya tiene receta", no_tiene_receta: "No tiene receta",
  tiene_cita_medica: "Tiene cita médica", esperando_autorizacion: "Esperando autorización", comprara_efectivo: "Comprará en efectivo",
  volver_a_llamar: "Volver a llamar", enviar_a_casa: "Enviar a la casa", compro: "Compró",
};
const statusLabels: Record<string, string> = { active: "Activo", paused: "Suspendido", completed: "Completado", retired: "Retirado" };

function buildFollowUpHref(input: { query: string; status: FollowUpStatus; insurerCode: string; branchCode: string; page: number }) {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.status !== "all") params.set("status", input.status);
  if (input.insurerCode) params.set("ars", input.insurerCode);
  if (input.branchCode) params.set("branch", input.branchCode);
  if (input.page > 1) params.set("page", String(input.page));
  const search = params.toString();
  return search ? `/programa?${search}` : "/programa";
}

function paginationPages(page: number, totalPages: number) {
  const first = Math.max(1, Math.min(page - 2, totalPages - 4));
  const last = Math.min(totalPages, first + 4);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
}

function ResultDialog({ plan, canDispense, onClose }: { plan: FollowUpPlan; canDispense: boolean; onClose: () => void }) {
  const [result, setResult] = useState("contesto");
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<DispensableProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<DispensableProduct | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (result !== "compro" || productQuery.trim().length < 2 || selectedProduct) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ planId: plan.id, q: productQuery.trim() });
        const response = await fetch(`/api/follow-up/dispensable-products?${params}`, { signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "No se pudo consultar el inventario.");
        setProducts(Array.isArray(body.items) ? body.items : []);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo consultar el inventario.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [plan.id, productQuery, result, selectedProduct]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(`/api/follow-up/plans/${plan.id}/contacts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "No se pudo registrar el resultado."); setSaving(false); return; }
    window.location.reload();
  };
  return <div className="followup-modal" role="dialog" aria-modal="true" aria-label={`Registrar resultado de ${plan.patientName}`}>
    <button className="followup-modal-backdrop" aria-label="Cerrar" onClick={onClose} />
    <section className="followup-modal-card followup-result-card"><header className="followup-modal-header"><div className="followup-modal-title"><span className="followup-modal-icon"><Phone size={21} /></span><div><span className="eyebrow">REGISTRAR CONTACTO</span><h2>{plan.patientName}</h2><p>{plan.phone} · {plan.insurer}</p></div></div><button className="followup-icon-btn" type="button" aria-label="Cerrar" onClick={onClose}><X size={20} /></button></header>
      <form className="followup-form followup-result-form" onSubmit={submit}>
        <section className="followup-form-section"><div className="followup-form-grid">
          <label><span>Resultado <b>*</b></span><select aria-label="Resultado" name="result" required value={result} onChange={(event) => { const next=event.target.value; setResult(next); setError(""); if(next!=="compro"){ setProducts([]); setSelectedProduct(null); setProductQuery(""); } }}>{Object.entries(resultLabels).filter(([value]) => value!=="compro" || canDispense).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Canal <b>*</b></span><select name="channel" defaultValue="call"><option value="call">Llamada</option><option value="whatsapp">WhatsApp</option><option value="in_person">Presencial</option></select></label>
          {result !== "compro" && <label><span>Próxima acción</span><input name="nextActionDate" type="date" /></label>}
          {result === "compro" && <div className="followup-purchase-fields followup-form-wide" aria-label="Datos de la dispensación">
            <div className="followup-schedule-note"><ShieldCheck size={17}/><span>La confirmación creará una dispensación, descontará inventario y avanzará el plan una sola vez.</span></div>
            <label className="followup-form-wide"><span>Producto dispensado <b>*</b></span><div className="followup-patient-search"><Search size={17}/><input type="search" aria-label="Buscar producto dispensado" value={productQuery} onChange={(event) => { setProductQuery(event.target.value); setSelectedProduct(null); setError(""); }} placeholder="Código o nombre del producto" autoComplete="off" /></div></label>
            <input type="hidden" name="productId" value={selectedProduct?.id ?? ""}/>
            <input type="hidden" name="idempotencyKey" value={`followup-${plan.id}-${plan.currentPrescription}`}/>
            <input type="hidden" name="currentPrescription" value={plan.currentPrescription}/>
            {selectedProduct ? <div className="followup-selected-patient followup-form-wide"><span><CheckCircle2 size={18}/></span><div><small>Producto seleccionado</small><strong>{selectedProduct.name}</strong><em>{selectedProduct.code} · Disponible {selectedProduct.available}</em></div><button type="button" onClick={() => { setSelectedProduct(null); setProductQuery(""); }}>Cambiar</button></div> : productQuery.trim().length >= 2 && <ul className="followup-patient-results followup-form-wide" role="list" aria-label="Productos disponibles">{products.map((product) => <li key={product.id}><button type="button" aria-label={`Seleccionar ${product.name}`} onClick={() => { setSelectedProduct(product); setProductQuery(product.name); setProducts([]); }}><span className="followup-patient-avatar"><Pill size={16}/></span><span><strong>{product.name}</strong><small>{product.code}{product.presentation ? ` · ${product.presentation}` : ""} · Disponible {product.available}</small></span></button></li>)}{!searching && products.length === 0 && <li className="followup-product-empty">No hay existencia utilizable para esta búsqueda.</li>}</ul>}
            {searching && <small className="followup-form-wide">Consultando inventario…</small>}
            <label><span>Cantidad dispensada <b>*</b></span><input aria-label="Cantidad dispensada" name="quantity" type="number" min="0.001" max="999999" step="0.001" required /></label>
            <label><span>Unidades por día</span><input aria-label="Unidades por día" name="unitsPerDay" type="number" min="0.0001" max="9999" step="0.0001" /></label>
            <label className="followup-checkbox followup-form-wide"><input aria-label="Indicaciones verificadas" name="directionsVerified" type="checkbox"/><span>Indicaciones verificadas por personal autorizado</span></label>
          </div>}
          <label className="followup-form-wide"><span>Observaciones</span><textarea name="observations" maxLength={1000} rows={3} placeholder="Detalle el resultado y cualquier compromiso acordado" /></label>
        </div></section>
        {error && <p className="form-error followup-form-error" role="alert">{error}</p>}
        <footer className="followup-modal-footer"><div><ShieldCheck size={15} /><span>{result === "compro" ? "La compra quedará respaldada por una dispensación auditable." : "La gestión quedará registrada en el historial."}</span></div><span className="followup-footer-actions"><button type="button" className="followup-btn followup-btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="followup-btn followup-btn-primary" disabled={saving}><CheckCircle2 size={17} />{saving ? "Guardando…" : "Registrar resultado"}</button></span></footer>
      </form>
    </section>
  </div>;
}

function TimelineDialog({ plan, onClose }: { plan: FollowUpPlan; onClose: () => void }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/follow-up/plans/${plan.id}/timeline`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "No se pudo consultar la trazabilidad.");
        if (active) setItems(Array.isArray(body.items) ? body.items : []);
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "No se pudo consultar la trazabilidad."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [plan.id]);

  return <div className="followup-modal" role="dialog" aria-modal="true" aria-label={`Trazabilidad de ${plan.patientName}`}>
    <button className="followup-modal-backdrop" aria-label="Cerrar" onClick={onClose}/>
    <section className="followup-modal-card followup-timeline-card">
      <header className="followup-modal-header"><div className="followup-modal-title"><span className="followup-modal-icon"><History size={21}/></span><div><span className="eyebrow">TRAZABILIDAD DEL SEGUIMIENTO</span><h2>{plan.patientName}</h2><p>{plan.phone} · {plan.insurer}</p></div></div><button className="followup-icon-btn" type="button" aria-label="Cerrar" onClick={onClose}><X size={20}/></button></header>
      <div className="followup-timeline-body">
        <div className="followup-timeline-policy"><ShieldCheck size={17}/><span>Historial de solo adición: muestra quién realizó cada gestión, por cuál canal, el resultado y la próxima acción.</span></div>
        {loading && <p className="followup-timeline-loading" role="status">Consultando trazabilidad…</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!loading && !error && items.length === 0 && <div className="followup-timeline-empty"><History size={25}/><strong>Aún no hay gestiones registradas.</strong><span>La creación del programa y los próximos contactos aparecerán aquí.</span></div>}
        {!loading && items.length > 0 && <ol className="followup-timeline-list">{items.map((item) => {
          const channel = item.channel === "whatsapp" ? "WhatsApp" : item.channel === "call" ? "Llamada" : item.channel === "in_person" ? "Presencial" : null;
          const Icon = item.type === "contact" ? (item.channel === "whatsapp" ? MessageCircle : Phone) : item.type === "purchase" ? Pill : ClipboardPlus;
          return <li key={item.id}><span><Icon size={16}/></span><article><header><div><strong>{item.title}</strong>{channel && <em>{channel}</em>}</div><time>{new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(item.occurredAt))}</time></header>{item.observations && <p>{item.observations}</p>}<footer><span>{item.actor ?? "Usuario autorizado"}</span>{item.nextActionDate && <span>Próxima acción: {formatDate(item.nextActionDate)}</span>}</footer></article></li>;
        })}</ol>}
      </div>
      <footer className="followup-modal-footer"><div><History size={15}/><span>Los registros anteriores no se reemplazan ni se eliminan.</span></div><span className="followup-footer-actions"><button type="button" className="followup-btn followup-btn-primary" onClick={onClose}>Cerrar trazabilidad</button></span></footer>
    </section>
  </div>;
}

export function FollowUpWorkspace(props: FollowUpWorkspaceProps) {
  const router = useRouter();
  const replace = router.replace;
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FollowUpPlan | null>(null);
  const [timelinePlan, setTimelinePlan] = useState<FollowUpPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState(props.query);
  const [selectedStatus, setSelectedStatus] = useState(props.status);
  const [selectedInsurer, setSelectedInsurer] = useState(props.insurerCode);
  const [selectedBranch, setSelectedBranch] = useState(props.branchCode);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [renderedResult, setRenderedResult] = useState(props.result);
  const today = useMemo(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(new Date()), []);

  if (renderedResult !== props.result) {
    setRenderedResult(props.result);
    setSearchQuery(props.query);
    setSelectedStatus(props.status);
    setSelectedInsurer(props.insurerCode);
    setSelectedBranch(props.branchCode);
    setIsTableLoading(false);
  }

  useEffect(() => {
    const normalized = searchQuery.trim();
    if (normalized === props.query.trim()) return;
    const timer = window.setTimeout(() => {
      setIsTableLoading(true);
      replace(buildFollowUpHref({ query: normalized, status: selectedStatus, insurerCode: selectedInsurer, branchCode: selectedBranch, page: 1 }), { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery, props.query, selectedStatus, selectedInsurer, selectedBranch, replace]);

  function navigate(next: { status?: FollowUpStatus; insurerCode?: string; branchCode?: string; page?: number }) {
    const status = next.status ?? selectedStatus;
    const insurerCode = next.insurerCode ?? selectedInsurer;
    const branchCode = next.branchCode ?? selectedBranch;
    setIsTableLoading(true);
    router.replace(buildFollowUpHref({ query: searchQuery.trim(), status, insurerCode, branchCode, page: next.page ?? 1 }), { scroll: false });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ page: 1 });
  }

  function clearFilters() {
    setSearchQuery("");
    setSelectedStatus("all");
    setSelectedInsurer("");
    setSelectedBranch("");
    setIsTableLoading(true);
    router.replace("/programa", { scroll: false });
  }

  function pageHref(page: number) {
    return buildFollowUpHref({ query: searchQuery.trim(), status: selectedStatus, insurerCode: selectedInsurer, branchCode: selectedBranch, page });
  }

  useEffect(() => {
    if (!selectedPlan && !timelinePlan) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelectedPlan(null); setTimelinePlan(null); }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedPlan, timelinePlan]);

  return <div className="page-stack followup-page">
    <section className="page-heading followup-heading"><div className="followup-heading-copy"><span className="followup-hero-icon"><HeartPulse size={24} /></span><div><p className="eyebrow">PROGRAMA DE CONTINUIDAD</p><h1>Plan de seguimiento</h1><p className="page-description">Organice recetas, próximas compras y contactos de uso continuo por ARS.</p></div></div><div className="followup-heading-actions"><button className="followup-btn followup-btn-secondary" aria-controls="followup-metrics" aria-expanded={metricsOpen} onClick={() => setMetricsOpen((open) => !open)}>{metricsOpen ? <EyeOff size={17} /> : <Eye size={17} />}{metricsOpen ? "Ocultar métricas" : "Mostrar métricas"}</button>{props.canWrite && <Link className="followup-btn followup-btn-primary" href="/programa/nuevo"><ClipboardPlus size={18} />Nuevo programa</Link>}</div></section>

    {metricsOpen && <section className="followup-summary-grid" id="followup-metrics" aria-label="Resumen de seguimiento">
      <button aria-label={`Planes registrados ${props.summary.total}`} aria-pressed={selectedStatus === "all"} className="panel followup-summary-card followup-summary-filter summary-total" onClick={() => { setSelectedStatus("all"); navigate({ status: "all" }); }} type="button"><ShieldCheck size={20}/><span><strong>{props.summary.total}</strong><small>Planes registrados</small></span></button>
      <button aria-label={`Contactar hoy ${props.summary.contactToday}`} aria-pressed={selectedStatus === "contact_today"} className="panel followup-summary-card followup-summary-filter summary-today" onClick={() => { setSelectedStatus("contact_today"); navigate({ status: "contact_today" }); }} type="button"><Phone size={20}/><span><strong>{props.summary.contactToday}</strong><small>Contactar hoy</small></span></button>
      <button aria-label={`Atrasados ${props.summary.overdue}`} aria-pressed={selectedStatus === "overdue"} className="panel followup-summary-card followup-summary-filter summary-overdue" onClick={() => { setSelectedStatus("overdue"); navigate({ status: "overdue" }); }} type="button"><CalendarClock size={20}/><span><strong>{props.summary.overdue}</strong><small>Atrasados</small></span></button>
      <button aria-label={`Próximos 3 días ${props.summary.nextThreeDays}`} aria-pressed={selectedStatus === "next_3_days"} className="panel followup-summary-card followup-summary-filter summary-next" onClick={() => { setSelectedStatus("next_3_days"); navigate({ status: "next_3_days" }); }} type="button"><CalendarClock size={20}/><span><strong>{props.summary.nextThreeDays}</strong><small>Próximos 3 días</small></span></button>
      <button aria-label={`Completados ${props.summary.completed}`} aria-pressed={selectedStatus === "completed"} className="panel followup-summary-card followup-summary-filter summary-completed" onClick={() => { setSelectedStatus("completed"); navigate({ status: "completed" }); }} type="button"><CheckCircle2 size={20}/><span><strong>{props.summary.completed}</strong><small>Completados</small></span></button>
    </section>}

    <section className="panel followup-worklist">
      <header className="followup-worklist-heading"><div><span className="eyebrow">AGENDA OPERATIVA</span><h2>Pacientes en seguimiento</h2></div><span>{props.result.total} resultado{props.result.total === 1 ? "" : "s"}</span></header>
      <form className="followup-filters" method="get" action="/programa" onSubmit={submitSearch}>
        <label className="followup-search"><Search size={16}/><input aria-label="Buscar seguimiento" name="q" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Paciente, teléfono o medicamento…" value={searchQuery} /></label>
        <label><Filter size={15}/><select aria-label="Filtrar por estado" name="status" onChange={(event) => { const status = event.target.value as FollowUpStatus; setSelectedStatus(status); navigate({ status }); }} value={selectedStatus}><option value="all">Todos los planes</option><option value="contact_today">Contactar hoy</option><option value="overdue">Contactos atrasados</option><option value="next_3_days">Próximos 3 días</option><option value="active">Activos</option><option value="paused">Suspendidos</option><option value="completed">Completados</option><option value="retired">Retirados</option></select></label>
        <label><select aria-label="Filtrar por ARS" name="ars" onChange={(event) => { const insurerCode = event.target.value; setSelectedInsurer(insurerCode); navigate({ insurerCode }); }} value={selectedInsurer}><option value="">Todas las ARS</option>{insurerRules.map((rule) => <option key={rule.code} value={rule.code}>{rule.name}</option>)}</select></label>
        <label><select aria-label="Filtrar por sucursal" name="branch" onChange={(event) => { const branchCode = event.target.value; setSelectedBranch(branchCode); navigate({ branchCode }); }} value={selectedBranch}><option value="">Todas las sucursales</option>{props.branches.map((branch) => <option key={branch.id} value={branch.code}>{branch.name} {branch.code}</option>)}</select></label>
        <button aria-label="Limpiar filtros" className="followup-btn followup-btn-secondary followup-filter-btn" onClick={clearFilters} type="button"><RotateCcw size={16}/><span>Limpiar</span></button>
      </form>

      {isTableLoading || props.result.items.length > 0 ? <div className="followup-table-wrap"><table className="followup-table" aria-label="Planes de seguimiento"><thead><tr><th>Paciente</th><th>ARS / vigencia</th><th>Tratamiento</th><th>Próxima compra</th><th>Contacto</th><th>Estado</th><th aria-label="Acciones" /></tr></thead><tbody className={isTableLoading ? "followup-table-skeleton" : undefined}>{isTableLoading ? Array.from({ length: 8 }, (_, index) => <tr data-testid="followup-skeleton-row" key={`skeleton-${index}`} className="followup-skeleton-row">{Array.from({ length: 7 }, (__, cell) => <td key={cell}><span className="followup-skeleton-line" /></td>)}</tr>) : props.result.items.map((plan) => {
        const overdue = plan.contactDate && plan.contactDate < today && plan.status === "active";
        const dueToday = plan.contactDate === today && plan.status === "active";
        return <tr key={plan.id}><td data-label="Paciente"><strong>{plan.patientName}</strong><span>{plan.phone}</span><small>{plan.branch ? `${plan.branch} ${plan.branchCode ?? ""}` : "Sin sucursal"}</small></td><td data-label="ARS / vigencia"><strong>{plan.insurer}</strong><span>{plan.mode === "case_number" ? `Caso ${plan.caseNumber}` : `Receta ${plan.currentPrescription} de ${plan.prescriptionCount}`}</span></td><td data-label="Tratamiento"><strong>{plan.medicines}</strong><span>{plan.doctor ?? "Médico no registrado"}</span><small>Primera compra: {formatDate(plan.firstPurchaseDate)}</small></td><td data-label="Próxima compra"><strong>{formatDate(plan.nextPurchaseDate)}</strong><span>Última: {formatDate(plan.lastPurchaseDate)}</span></td><td data-label="Contacto"><strong className={overdue ? "text-danger" : dueToday ? "text-warning" : ""}>{formatDate(plan.contactDate)}</strong><span>{plan.lastResult ? resultLabels[plan.lastResult] ?? plan.lastResult : "Sin contacto"}</span></td><td data-label="Estado"><span className={`status followup-status-${plan.status}`}>{statusLabels[plan.status]}</span></td><td data-label="Acción"><div className="followup-row-actions"><button type="button" className="followup-action followup-history-action" aria-label={`Ver trazabilidad de ${plan.patientName}`} onClick={() => setTimelinePlan(plan)}><History size={15}/><span>Historial</span></button>{props.canWrite && plan.status === "active" && <button type="button" className="followup-action" aria-label={`Registrar resultado de ${plan.patientName}`} onClick={() => setSelectedPlan(plan)}><Phone size={15}/><span>Registrar</span></button>}</div></td></tr>;
      })}</tbody></table></div> : <div className="followup-empty"><CalendarClock size={28}/><strong>No hay planes que coincidan con los filtros.</strong><span>Ajuste la búsqueda o cree un plan con una primera compra verificada.</span></div>}
      <footer className="followup-pagination-footer">
        <div className="followup-pagination-summary"><strong>Página {props.result.page} de {props.result.totalPages}</strong><span>{props.result.total} plan{props.result.total === 1 ? "" : "es"}</span><span>{props.result.pageSize} por página</span></div>
        {isTableLoading ? <div aria-label="Cargando paginación" className="followup-pagination-skeleton" data-testid="followup-pagination-skeleton"><span/><span/><span/><span/></div> : props.result.totalPages > 1 && <nav className="followup-pagination" aria-label="Paginación">
          {props.result.page > 1 ? <Link aria-label="Primera página" href={pageHref(1)} onClick={() => setIsTableLoading(true)}><ChevronsLeft size={16}/></Link> : <span aria-disabled="true"><ChevronsLeft size={16}/></span>}
          {props.result.page > 1 ? <Link aria-label="Página anterior" href={pageHref(props.result.page - 1)} onClick={() => setIsTableLoading(true)}><ChevronLeft size={16}/></Link> : <span aria-disabled="true"><ChevronLeft size={16}/></span>}
          {paginationPages(props.result.page, props.result.totalPages).map((page) => <Link aria-current={page === props.result.page ? "page" : undefined} aria-label={`Página ${page}`} className={page === props.result.page ? "is-active" : undefined} href={pageHref(page)} key={page} onClick={() => setIsTableLoading(true)}>{page}</Link>)}
          {props.result.page < props.result.totalPages ? <Link aria-label="Página siguiente" href={pageHref(props.result.page + 1)} onClick={() => setIsTableLoading(true)}><ChevronRight size={16}/></Link> : <span aria-disabled="true"><ChevronRight size={16}/></span>}
          {props.result.page < props.result.totalPages ? <Link aria-label="Última página" href={pageHref(props.result.totalPages)} onClick={() => setIsTableLoading(true)}><ChevronsRight size={16}/></Link> : <span aria-disabled="true"><ChevronsRight size={16}/></span>}
        </nav>}
      </footer>
    </section>

    <section className="panel insurer-rules-panel"><header><div><span className="eyebrow">REGLAS INSTITUCIONALES</span><h2>Vigencia de recetas por ARS</h2><p>La cantidad se cuenta desde la fecha de la primera compra. El contacto se programa 3 días antes.</p></div></header><div className="insurer-rule-grid">{insurerRules.map((rule) => <article key={rule.code}><span>{rule.name}</span><strong>{rule.mode === "case_number" ? "Por número de caso" : `${rule.prescriptionMonths} meses`}</strong></article>)}</div></section>

    {selectedPlan && <ResultDialog plan={selectedPlan} canDispense={props.canDispense} onClose={() => setSelectedPlan(null)} />}
    {timelinePlan && <TimelineDialog plan={timelinePlan} onClose={() => setTimelinePlan(null)} />}
  </div>;
}
