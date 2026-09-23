"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleGauge,
  PackageSearch,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { ProductCreateDialog } from "./product-create-dialog";
import { InventoryMaintenanceDialog } from "./inventory-maintenance-dialog";
import type {
  CatalogMetadata,
  InventoryBranch,
  InventoryMaintenanceCatalogs,
  InventorySearchResult,
  InventoryStockFilter,
  InventoryStockStatus,
} from "@/modules/inventory/inventory-catalog";

const inventoryTools = [
  { id: "catalog", title: "Catálogo maestro", detail: "Códigos y descripciones validados", icon: PackageSearch, ready: true },
  { id: "branches", title: "Existencias por sucursal", detail: "Consulta simultánea de las cuatro sucursales", icon: Boxes, ready: true },
  { id: "alerts", title: "Agotados y bajo mínimo", detail: "Priorización para compra y reposición", icon: AlertTriangle, ready: true },
  { id: "expiry", title: "Lotes y vencimientos", detail: "Ventanas de 30, 60 y 90 días", icon: CalendarClock, ready: false },
  { id: "transfers", title: "Traslados sugeridos", detail: "Propuestas entre sucursales con aprobación humana", icon: ArrowLeftRight, ready: false },
  { id: "demand", title: "Demanda y reposición", detail: "Rotación, consumo y estimación de compra", icon: TrendingUp, ready: false },
  { id: "anomalies", title: "Anomalías de inventario", detail: "Duplicidades, diferencias y datos incompletos", icon: ShieldAlert, ready: false },
  { id: "coverage", title: "Cobertura PROCONTRA", detail: "Disponibilidad frente a próximas reposiciones", icon: CircleGauge, ready: false },
];

const statusLabels: Record<InventoryStockStatus, string> = {
  available: "Disponible",
  low_stock: "Bajo mínimo",
  out_of_stock: "Agotado",
  no_data: "Sin inventario",
};

const statusClasses: Record<InventoryStockStatus, string> = {
  available: "status status-emerald",
  low_stock: "status status-amber",
  out_of_stock: "status status-rose",
  no_data: "status status-slate",
};

function inventoryUrl(input: {
  query: string;
  filter: InventoryStockFilter;
  branch: string;
  page: number;
  view: string;
}) {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.filter !== "all") params.set("status", input.filter);
  if (input.branch) params.set("branch", input.branch);
  if (input.page > 1) params.set("page", String(input.page));
  if (input.view !== "catalog") params.set("view", input.view);
  const suffix = params.toString();
  return suffix ? `/inventario?${suffix}` : "/inventario";
}

export function InventoryWorkspace({
  metadata,
  query,
  result,
  view,
  branches,
  filter,
  branch,
  canWrite,
  maintenance,
}: {
  metadata: CatalogMetadata;
  query: string;
  result: InventorySearchResult;
  view: string;
  branches: InventoryBranch[];
  filter: InventoryStockFilter;
  branch: string;
  canWrite: boolean;
  maintenance: InventoryMaintenanceCatalogs;
}) {
  const router = useRouter();
  const replace = router.replace;
  const [showSupportPanels, setShowSupportPanels] = useState(false);
  const [searchQuery, setSearchQuery] = useState(query);
  const [selectedFilter, setSelectedFilter] = useState(filter);
  const [selectedBranch, setSelectedBranch] = useState(branch);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [renderedResult, setRenderedResult] = useState(result);
  const gridTemplateColumns = `minmax(110px,.65fr) minmax(260px,1.8fr) minmax(125px,.8fr) repeat(${branches.length}, minmax(145px,.9fr))`;

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
      replace(inventoryUrl({
        query: normalized,
        filter: selectedFilter,
        branch: selectedBranch,
        page: 1,
        view,
      }), { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery, query, selectedFilter, selectedBranch, view, replace]);

  function replaceQuery(nextFilter: InventoryStockFilter, nextBranch: string) {
    setIsTableLoading(true);
    router.replace(inventoryUrl({
      query: searchQuery.trim(),
      filter: nextFilter,
      branch: nextBranch,
      page: 1,
      view,
    }), { scroll: false });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsTableLoading(true);
    router.replace(inventoryUrl({
      query: searchQuery.trim(),
      filter: selectedFilter,
      branch: selectedBranch,
      page: 1,
      view,
    }), { scroll: false });
  }


  function clearFilters() {
    setSearchQuery("");
    setSelectedFilter("all");
    setSelectedBranch("");
    setIsTableLoading(true);
    router.replace("/inventario", { scroll: false });
  }

  return (
    <div className="page-stack inventory-workspace">
      <section className="page-heading">
        <div>
          <p className="eyebrow">INVENTARIO MULTISUCURSAL</p>
          <h1>Consulta de productos</h1>
          <p className="page-description">Busque el catálogo y compare la existencia verificada de cada sucursal en una sola tabla.</p>
        </div>
        <div className="heading-actions">
          <button aria-controls="inventory-summary-tools" aria-expanded={showSupportPanels} className="button button-secondary" onClick={() => setShowSupportPanels((current) => !current)} type="button">
            {showSupportPanels ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showSupportPanels ? "Ocultar resumen y herramientas" : "Mostrar resumen y herramientas"}
          </button>
          {canWrite && <ProductCreateDialog branches={branches} maintenance={maintenance} />}
        </div>
      </section>


      {showSupportPanels && (
        <div className="inventory-optional-sections" id="inventory-summary-tools">
          <section className="module-metric-grid" aria-label="Resumen del catálogo">
            <article className="module-metric-card"><i className="module-metric-accent module-metric-blue" /><p>Productos cargados</p><strong>{metadata.catalogEntries.toLocaleString("en-US")}</strong><span>Catálogo maestro validado</span></article>
            <article className="module-metric-card"><i className="module-metric-accent module-metric-emerald" /><p>Códigos únicos</p><strong>{metadata.uniqueCodes.toLocaleString("en-US")}</strong><span>Sin conflictos código–descripción</span></article>
            <article className="module-metric-card"><i className="module-metric-accent module-metric-amber" /><p>Sucursales visibles</p><strong>{branches.length}</strong><span>Columnas de consulta simultánea</span></article>
            <article className="module-metric-card"><i className="module-metric-accent module-metric-rose" /><p>Resultados actuales</p><strong>{result.total.toLocaleString("en-US")}</strong><span>Según búsqueda y filtros</span></article>
          </section>

          <section className="panel inventory-tools-panel">
            <div className="panel-heading"><div><p className="section-kicker">OPERACIÓN</p><h2>Herramientas de inventario</h2></div>{canWrite && <InventoryMaintenanceDialog />}</div>
            <div className="inventory-tool-grid">
              {inventoryTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link className={`inventory-tool-card${view === tool.id ? " inventory-tool-active" : ""}`} href={`/inventario?view=${tool.id}`} key={tool.id}>
                    <Icon size={19} /><strong>{tool.title}</strong><span>{tool.detail}</span>
                    <small className={tool.ready ? "tool-ready" : "tool-blocked"}>{tool.ready ? <><CheckCircle2 size={13} /> Disponible</> : "Requiere inventario operativo"}</small>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <section className="panel inventory-products-panel">
        <div className="panel-heading inventory-products-heading">
          <div><p className="section-kicker">CATÁLOGO Y EXISTENCIAS</p><h2>Listado de productos</h2></div>
          <span className="catalog-result-count">{result.total.toLocaleString("en-US")} {result.total === 1 ? "resultado" : "resultados"}</span>
        </div>

        <form action="/inventario" autoComplete="off" className="inventory-query-form" method="get" onSubmit={submitSearch} role="search">
          <input name="view" type="hidden" value={view} />
          <label className="inventory-query-search"><Search size={18} /><input aria-label="Buscar producto" autoComplete="off" name="inventory-product-query" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Escriba código, producto o presentación…" spellCheck={false} type="search" value={searchQuery} /></label>
          <label className="inventory-filter-field"><span><SlidersHorizontal size={14} /> Estado</span><select aria-label="Filtrar por estado" name="status" onChange={(event) => { const next = event.target.value as InventoryStockFilter; setSelectedFilter(next); replaceQuery(next, selectedBranch); }} value={selectedFilter}><option value="all">Todos</option><option value="with_stock">Con existencia</option><option value="low_stock">Bajo mínimo</option><option value="out_of_stock">Agotados</option><option value="without_data">Sin dato operativo</option></select></label>
          <label className="inventory-filter-field"><span><Boxes size={14} /> Sucursal</span><select aria-label="Filtrar por sucursal" name="branch" onChange={(event) => { const next = event.target.value; setSelectedBranch(next); replaceQuery(selectedFilter, next); }} value={selectedBranch}><option value="">Todas las sucursales</option>{branches.map((item) => <option key={item.id} value={item.code}>{item.name} {item.code}</option>)}</select></label>
          <button aria-label="Limpiar filtros" className="button button-secondary inventory-reset" disabled={isTableLoading} onClick={clearFilters} type="button"><RotateCcw size={15} /></button>
        </form>
        <p className="inventory-data-contract"><strong>Datos operativos por posición:</strong> SUCURSAL, EXISTENCIA, INVENTARIO_MINIMO, LOTE, VENCIMIENTO, COSTO, PRECIO y ACTUALIZADO_EN.</p>
        <p className="inventory-scroll-hint"><ArrowLeftRight size={14} /> Deslice horizontalmente para comparar las cuatro sucursales</p>

        <div aria-busy={isTableLoading} className="inventory-live-table" role="table" aria-label="Productos y existencias por sucursal">
          <div className="inventory-live-row inventory-live-header" role="row" style={{ gridTemplateColumns }}>
            <span role="columnheader">Código</span><span role="columnheader">Producto</span><span role="columnheader">Estado</span>
            {branches.map((item) => <span key={item.id} role="columnheader">{item.name} {item.code}</span>)}
          </div>
          {isTableLoading ? (
            <div aria-label="Cargando productos" className="inventory-table-skeleton" role="status">
              {Array.from({ length: 8 }, (_, rowIndex) => (
                <div className="inventory-live-row inventory-skeleton-row" data-testid="inventory-skeleton-row" key={rowIndex} style={{ gridTemplateColumns }}>
                  {Array.from({ length: 3 + branches.length }, (_, cellIndex) => <span className="skeleton-line" key={cellIndex} />)}
                </div>
              ))}
            </div>
          ) : result.items.length === 0 ? (
            <div className="inventory-empty-state"><PackageSearch size={28} /><strong>No encontramos productos</strong><span>Pruebe otro término o limpie los filtros aplicados.</span></div>
          ) : result.items.map((product) => (
            <div className="inventory-live-row" role="row" style={{ gridTemplateColumns }} key={product.id}>
              <strong className="inventory-product-code">{product.code}</strong>
              <span className="inventory-product-name"><strong>{product.name}</strong><small>{product.presentation || "Presentación no informada"}</small></span>
              <span><span className={statusClasses[product.status]}>{statusLabels[product.status]}</span></span>
              {branches.map((item) => {
                const stock = product.stockByBranch[item.code];
                return (
                  <span className={stock ? "branch-stock-cell" : "branch-stock-cell branch-stock-missing"} key={item.id}>
                    {stock ? <><strong>{stock.available.toLocaleString("es-DO")} disponibles</strong><small>{stock.onHand.toLocaleString("es-DO")} físico · {stock.reserved.toLocaleString("es-DO")} reservado</small></> : <><strong>Sin dato</strong><small>No se asume existencia cero</small></>}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <div className="table-footer inventory-pagination">
          <span>Página {result.page} de {result.totalPages}</span>
          <div>
            {result.page > 1 && <Link href={inventoryUrl({ query, filter, branch, page: result.page - 1, view })}>Anterior</Link>}
            {result.page < result.totalPages && <Link href={inventoryUrl({ query, filter, branch, page: result.page + 1, view })}>Siguiente</Link>}
          </div>
        </div>
      </section>
    </div>
  );
}
