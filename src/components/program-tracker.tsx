import { AlertTriangle, CheckCircle2, CircleDashed, FileCheck2, LockKeyhole } from "lucide-react";
import { getCapabilitiesBySection, programCapabilities, programSections, type CapabilityStatus } from "@/modules/program/program-requirements";

const statusLabel: Record<CapabilityStatus, string> = {
  pending: "Pendiente",
  designed: "Diseñada",
  implemented: "Implementada",
  blocked: "Requiere integración",
};

const statusIcon = {
  pending: CircleDashed,
  designed: FileCheck2,
  implemented: CheckCircle2,
  blocked: LockKeyhole,
};

export function ProgramTracker() {
  const statusCounts = programCapabilities.reduce<Record<CapabilityStatus, number>>(
    (counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }),
    { pending: 0, designed: 0, implemented: 0, blocked: 0 },
  );

  return (
    <div className="page-stack program-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">PLAN OBJETIVO PROCONTRA</p>
          <h1>Programa de implementación</h1>
          <p className="page-description">Matriz trazable de cada función definida en el PDF institucional.</p>
        </div>
        <div className="program-source"><FileCheck2 size={17} /><span><strong>Fuente institucional</strong>Plan_Objetivo_PROCONTRA.pdf</span></div>
      </section>

      <section className="program-status-grid" aria-label="Resumen del programa">
        <article className="panel program-total" aria-label={`${programCapabilities.length} capacidades trazadas`}><strong>{programCapabilities.length}</strong><span>capacidades trazadas</span></article>
        {(["designed", "implemented", "pending", "blocked"] as CapabilityStatus[]).map((status) => {
          const Icon = statusIcon[status];
          return <article className={`panel program-status program-status-${status}`} key={status}><Icon size={18} /><div><strong>{statusCounts[status]}</strong><span>{statusLabel[status]}</span></div></article>;
        })}
      </section>

      <section className="program-callout">
        <AlertTriangle size={18} />
        <div><strong>Implementación por controles verificables</strong><span>“Diseñada” significa que existe interfaz demostrativa; solo se marcará “Implementada” cuando la lógica, persistencia, permisos y pruebas estén completas.</span></div>
      </section>

      <section className="program-sections">
        {programSections.map((section, index) => {
          const capabilities = getCapabilitiesBySection(section.id);
          return (
            <details className="panel program-section" key={section.id} open={index === 0}>
              <summary>
                <span className="program-section-number">{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{section.title}</strong><small>{section.objective}</small></span>
                <em>{capabilities.length} funciones</em>
              </summary>
              <div className="program-capability-list">
                {capabilities.map((item) => {
                  const Icon = statusIcon[item.status];
                  return (
                    <article className="program-capability" key={item.id}>
                      <span className={`program-capability-status status-${item.status}`}><Icon size={14} /></span>
                      <div>
                        <span className="program-capability-id">{item.id} · {item.kind}</span>
                        <h3>{item.title}</h3>
                        <p>{item.acceptance}</p>
                        <small>{item.pdfSection}</small>
                        {item.dependency && <span className="program-dependency">Dependencia: <strong>{item.dependency}</strong></span>}
                      </div>
                      <span className={`program-status-pill program-pill-${item.status}`}>{statusLabel[item.status]}</span>
                    </article>
                  );
                })}
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
