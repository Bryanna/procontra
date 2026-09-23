import type { HTMLAttributes } from "react";

function Line({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden="true" className={`skeleton-line ${className}`} {...props} />;
}

export function DashboardSkeleton() {
  return (
    <div aria-label="Cargando panel operativo" aria-live="polite" className="page-stack skeleton-page" role="status">
      <div className="skeleton-heading"><div><Line className="skeleton-kicker" /><Line className="skeleton-title" /><Line className="skeleton-description" /></div><Line className="skeleton-action" /></div>
      <div className="metric-grid">{Array.from({ length: 4 }, (_, index) => <div className="metric-card skeleton-card" data-testid="skeleton-metric" key={index}><Line className="skeleton-icon" /><div><Line className="skeleton-label" /><Line className="skeleton-number" /><Line className="skeleton-caption" /></div></div>)}</div>
      <Line className="skeleton-banner" />
      <div className="dashboard-grid"><div className="panel skeleton-panel"><Line className="skeleton-panel-heading" />{Array.from({ length: 5 }, (_, index) => <Line className="skeleton-table-row" key={index} />)}</div><div className="panel skeleton-panel"><Line className="skeleton-panel-heading" /><Line className="skeleton-chart" /></div></div>
    </div>
  );
}

export function InventorySkeleton() {
  return (
    <div aria-label="Cargando inventario" aria-live="polite" className="page-stack skeleton-page" role="status">
      <div className="skeleton-heading"><div><Line className="skeleton-kicker" /><Line className="skeleton-title" /><Line className="skeleton-description" /></div><Line className="skeleton-action" /></div>
      <Line className="skeleton-banner" />
      <div className="module-metric-grid">{Array.from({ length: 4 }, (_, index) => <div className="module-metric-card skeleton-card" data-testid="skeleton-metric" key={index}><Line className="skeleton-label" /><Line className="skeleton-number" /><Line className="skeleton-caption" /></div>)}</div>
      <div className="panel skeleton-inventory-panel"><div className="skeleton-filter-row"><Line /><Line /><Line /><Line /></div><Line className="skeleton-table-header" />{Array.from({ length: 8 }, (_, index) => <Line className="skeleton-product-row" data-testid="skeleton-product-row" key={index} />)}</div>
    </div>
  );
}
