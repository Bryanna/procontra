import Link from "next/link";
import {
  ArrowRight,
  Download,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { ModuleConfig } from "@/modules/platform/module-config";

const metricToneClass = {
  emerald: "module-metric-accent module-metric-emerald",
  amber: "module-metric-accent module-metric-amber",
  blue: "module-metric-accent module-metric-blue",
  rose: "module-metric-accent module-metric-rose",
};

export function ModuleOverview({ config }: { config: ModuleConfig }) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{config.eyebrow}</p>
          <h1>{config.title}</h1>
          <p className="page-description">{config.description}</p>
        </div>
        <div className="heading-actions">
          <button className="button button-secondary" type="button">
            <Download size={17} /> {config.secondaryAction}
          </button>
          <button className="button button-primary" type="button">
            <Plus size={17} /> {config.action}
          </button>
        </div>
      </section>

      <section className="module-metric-grid" aria-label={`Resumen de ${config.title}`}>
        {config.metrics.map((metric) => (
          <article className="module-metric-card" key={metric.label}>
            <i className={metricToneClass[metric.tone]} />
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.detail}</span>
          </article>
        ))}
      </section>

      <div className="module-layout">
        <section className="panel module-table-panel">
          <div className="panel-heading module-panel-heading">
            <div>
              <p className="section-kicker">VISTA OPERATIVA</p>
              <h2>{config.tableTitle}</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Opciones de tabla">
              <SlidersHorizontal size={17} />
            </button>
          </div>
          <div className="table-toolbar">
            <label>
              <Search size={16} />
              <input aria-label={`Buscar en ${config.title}`} placeholder="Buscar…" />
            </label>
            <button type="button"><Filter size={15} /> Filtrar</button>
          </div>
          <div className="module-table" role="table" aria-label={config.tableTitle}>
            <div className="module-row module-row-header" role="row">
              {config.columns.map((column) => <span key={column}>{column}</span>)}
            </div>
            {config.rows.map((row) => (
              <div className="module-row" role="row" key={`${row.primary}-${row.secondary}`}>
                {config.slug === "pacientes" && row.primary === "María Rodríguez" ? (
                  <Link className="module-primary module-primary-link" href="/pacientes/maria-rodriguez">
                    <i>{row.primary.charAt(0)}</i>{row.primary}
                  </Link>
                ) : (
                  <span className="module-primary"><i>{row.primary.charAt(0)}</i>{row.primary}</span>
                )}
                <span>{row.secondary}</span>
                <span className="muted-cell">{row.meta}</span>
                <span><span className={`status status-${row.tone}`}>{row.status}</span></span>
              </div>
            ))}
          </div>
          <div className="table-footer">
            <span>Mostrando {config.rows.length} registros de demostración</span>
            <button type="button">Ver todos <ArrowRight size={14} /></button>
          </div>
        </section>

        <aside className="panel insight-panel">
          <div className="insight-icon"><Sparkles size={19} /></div>
          <p className="section-kicker">LECTURA RÁPIDA</p>
          <h2>{config.insightTitle}</h2>
          <ul>
            {config.insights.map((insight) => <li key={insight}>{insight}</li>)}
          </ul>
          <div className="insight-note">
            <strong>Datos de demostración</strong>
            <span>La conexión con el servidor se realizará en la siguiente etapa.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
