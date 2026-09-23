import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  MessageCircleMore,
  PackageCheck,
  Phone,
  Pill,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Patient } from "@/modules/patients/demo-patient";

export function PatientProfile({ patient }: { patient: Patient }) {
  const treatment = patient.treatment;

  return (
    <div className="page-stack patient-page">
      <Link className="back-link" href="/pacientes"><ArrowLeft size={15} /> Volver a pacientes</Link>

      <section className="patient-hero panel">
        <div className="patient-avatar-large">{patient.initials}</div>
        <div className="patient-identity">
          <div className="patient-title-line">
            <h1>{patient.name}</h1>
            <span className="status status-emerald">{patient.continuityStatus}</span>
          </div>
          <div className="patient-meta-line">
            <span><UserRound size={14} /> Cédula {patient.document}</span>
            <span><Phone size={14} /> {patient.phone}</span>
            <span><MapPin size={14} /> {patient.branch}</span>
          </div>
          <div className="patient-tags">
            <span><ShieldCheck size={13} /> {patient.consent}</span>
            <span>{patient.insurance}</span>
            <span>Registrada el {patient.joinedAt}</span>
          </div>
        </div>
        <div className="patient-hero-actions">
          <button className="button button-secondary" type="button"><MessageCircleMore size={16} /> WhatsApp</button>
          <button className="button button-primary" type="button"><Plus size={16} /> Registrar dispensación</button>
        </div>
      </section>

      <section className="patient-summary-grid" aria-label="Resumen de continuidad">
        <article className="patient-summary-card panel">
          <span className="summary-icon summary-icon-emerald"><Pill size={18} /></span>
          <div><p>Tratamiento activo</p><strong>{treatment.name}</strong><small>{treatment.directions}</small></div>
        </article>
        <article className="patient-summary-card panel">
          <span className="summary-icon summary-icon-blue"><CalendarDays size={18} /></span>
          <div><p>Agotamiento estimado</p><strong>{treatment.estimatedEnd}</strong><small>{treatment.coverageDays} días de cobertura</small></div>
        </article>
        <article className="patient-summary-card panel">
          <span className="summary-icon summary-icon-amber"><BellRing size={18} /></span>
          <div><p>Próxima acción</p><strong>{patient.nextAction}</strong><small>{patient.nextActionDate}</small></div>
        </article>
        <article className="patient-summary-card panel">
          <span className="summary-icon summary-icon-emerald"><PackageCheck size={18} /></span>
          <div><p>Disponibilidad</p><strong>12 unidades</strong><small>{treatment.stockStatus}</small></div>
        </article>
      </section>

      <div className="patient-content-grid">
        <div className="patient-main-column">
          <section className="panel treatment-card">
            <div className="panel-heading">
              <div><p className="section-kicker">TRATAMIENTO ACTIVO</p><h2>{treatment.name}</h2></div>
              <span className="status status-emerald">{treatment.status}</span>
            </div>
            <div className="treatment-details">
              <div><span>Presentación</span><strong>{treatment.presentation}</strong></div>
              <div><span>Indicación registrada</span><strong>{treatment.directions}</strong></div>
              <div><span>Última cantidad</span><strong>{treatment.quantity}</strong></div>
              <div><span>Última dispensación</span><strong>{treatment.lastDispensed}</strong></div>
            </div>
            <div className="continuity-track-block">
              <div className="continuity-track-heading"><span>Ciclo de continuidad</span><strong>26 de {treatment.coverageDays} días</strong></div>
              <div className="continuity-progress"><i style={{ width: "87%" }} /></div>
              <div className="continuity-dates"><span>Dispensado {treatment.lastDispensed}</span><span>Agotamiento {treatment.estimatedEnd}</span></div>
            </div>
            <div className="stock-confirmation"><CheckCircle2 size={17} /><div><strong>{treatment.stockStatus}</strong><span>Puede reservarse antes de contactar a la paciente.</span></div><button type="button">Crear reserva</button></div>
          </section>

          <section className="panel">
            <div className="panel-heading"><div><p className="section-kicker">TRAZABILIDAD</p><h2>Historial de dispensaciones</h2></div><button type="button">Ver todo</button></div>
            <div className="patient-dispensation-table" role="table" aria-label="Historial de dispensaciones">
              <div className="patient-dispensation-row patient-dispensation-header" role="row"><span>Fecha</span><span>Medicamento</span><span>Documento</span><span>Estado</span></div>
              {patient.dispensations.map((item) => (
                <div className="patient-dispensation-row" role="row" key={item.document}>
                  <span>{item.date}</span>
                  <span><strong>{item.medicine}</strong><small>{item.quantity} · {item.branch}</small></span>
                  <span><FileText size={14} /> {item.document}</span>
                  <span><span className="status status-emerald">{item.status}</span></span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="patient-side-column">
          <section className="panel next-action-card">
            <div className="next-action-icon"><Clock3 size={20} /></div>
            <p className="section-kicker">SIGUIENTE ACCIÓN</p>
            <h2>{patient.nextAction}</h2>
            <strong>{patient.nextActionDate}</strong>
            <p>El inventario ya fue validado. El mensaje puede enviarse sin ofrecer un producto agotado.</p>
            <button className="button button-primary" type="button"><MessageCircleMore size={16} /> Abrir conversación</button>
          </section>

          <section className="panel activity-card">
            <div className="panel-heading"><div><p className="section-kicker">LÍNEA DE TIEMPO</p><h2>Actividad reciente</h2></div></div>
            <ul className="patient-activity-list">
              {patient.activity.map((item) => (
                <li key={item.title}><i className={`activity-${item.tone}`} /><div><strong>{item.title}</strong><span>{item.detail}</span><time>{item.time}</time></div></li>
              ))}
            </ul>
          </section>

          <section className="patient-data-note">
            <ClipboardCheck size={17} />
            <div><strong>Perfil demostrativo</strong><span>No contiene datos de pacientes reales.</span></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
