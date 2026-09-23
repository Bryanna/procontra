import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  CircleAlert,
  FileScan,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react";

const metrics = [
  {
    label: "Pacientes en seguimiento",
    value: "248",
    change: "+18 este mes",
    icon: UsersRound,
    tone: "emerald",
  },
  {
    label: "Alertas para hoy",
    value: "17",
    change: "6 requieren revisión",
    icon: CalendarClock,
    tone: "amber",
  },
  {
    label: "Reservas activas",
    value: "12",
    change: "9 listas para retiro",
    icon: PackageCheck,
    tone: "blue",
  },
  {
    label: "Riesgos de inventario",
    value: "8",
    change: "3 productos agotados",
    icon: CircleAlert,
    tone: "rose",
  },
] as const;

const priorities = [
  {
    patient: "María Rodríguez",
    medication: "Losartán 50 mg",
    branch: "Esperanza 70",
    status: "Reposición hoy",
    tone: "amber",
  },
  {
    patient: "José Martínez",
    medication: "Metformina 850 mg",
    branch: "Esperanza 70",
    status: "Stock confirmado",
    tone: "emerald",
  },
  {
    patient: "Ana Castillo",
    medication: "Amlodipino 10 mg",
    branch: "Amina 01",
    status: "Sin respuesta",
    tone: "slate",
  },
  {
    patient: "Rafael Peña",
    medication: "Insulina glargina",
    branch: "Jaibón 81",
    status: "Revisión humana",
    tone: "rose",
  },
];

const stockRisks = [
  { name: "Losartán 50 mg", detail: "6 unidades · mínimo 12", level: 38 },
  { name: "Metformina 850 mg", detail: "9 unidades · mínimo 16", level: 54 },
  { name: "Amlodipino 10 mg", detail: "3 unidades · mínimo 10", level: 27 },
];

const toneClasses = {
  emerald: "metric-icon metric-icon-emerald",
  amber: "metric-icon metric-icon-amber",
  blue: "metric-icon metric-icon-blue",
  rose: "metric-icon metric-icon-rose",
};

export default function Home() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">PROCONTRA · SUCURSAL ESPERANZA 70</p>
          <h1>Panel operativo</h1>
          <p className="page-description">
            Continuidad, inventario y atención prioritaria en una sola vista.
          </p>
        </div>
        <div className="heading-actions">
          <Link className="button button-secondary" href="/documentos">
            <FileScan size={17} /> Procesar documento
          </Link>
          <Link className="button button-primary" href="/dispensaciones">
            Registrar dispensación <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section className="metric-grid" aria-label="Resumen operativo">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <div className={toneClasses[metric.tone]}>
                <Icon size={20} />
              </div>
              <div>
                <p className="metric-label">{metric.label}</p>
                <p className="metric-value">{metric.value}</p>
                <p className="metric-change">{metric.change}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="notice-card">
        <div className="notice-icon">
          <ShieldCheck size={20} />
        </div>
        <div>
          <p className="notice-title">Operación protegida</p>
          <p>
            14 documentos fueron conciliados sin duplicar salidas. Hay 3 casos
            pendientes de validación humana.
          </p>
        </div>
        <Link href="/documentos">Revisar excepciones</Link>
      </section>

      <div className="dashboard-grid">
        <section className="panel priority-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">SEGUIMIENTO</p>
              <h2>Prioridades de hoy</h2>
            </div>
            <Link href="/continuidad">Ver todos <ArrowRight size={15} /></Link>
          </div>
          <div className="priority-table" role="table" aria-label="Prioridades de hoy">
            <div className="priority-row priority-header" role="row">
              <span>Paciente</span>
              <span>Tratamiento</span>
              <span>Sucursal</span>
              <span>Estado</span>
            </div>
            {priorities.map((item) => (
              <div className="priority-row" role="row" key={item.patient}>
                <span className="patient-cell">
                  <span className="avatar">{item.patient.charAt(0)}</span>
                  <span>{item.patient}</span>
                </span>
                <span>{item.medication}</span>
                <span className="muted-cell">{item.branch}</span>
                <span>
                  <span className={`status status-${item.tone}`}>{item.status}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel continuity-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">ÚLTIMOS 30 DÍAS</p>
              <h2>Continuidad confirmada</h2>
            </div>
            <TrendingUp className="positive-icon" size={20} />
          </div>
          <div className="continuity-score">
            <strong>84%</strong>
            <span>+6.4% frente al periodo anterior</span>
          </div>
          <div className="bar-chart" aria-label="Tendencia de continuidad">
            {[42, 56, 49, 68, 62, 78, 72, 86, 79, 91, 84, 96].map((height, index) => (
              <span style={{ height: `${height}%` }} key={`${height}-${index}`} />
            ))}
          </div>
          <div className="continuity-legend">
            <span><i className="dot dot-green" /> 209 confirmados</span>
            <span><i className="dot dot-amber" /> 27 pendientes</span>
            <span><i className="dot dot-red" /> 12 en riesgo</span>
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid-bottom">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">INVENTARIO</p>
              <h2>Productos que requieren acción</h2>
            </div>
            <Link href="/inventario">Abrir inventario <ArrowRight size={15} /></Link>
          </div>
          <div className="stock-list">
            {stockRisks.map((item) => (
              <div className="stock-item" key={item.name}>
                <div className="stock-icon"><Boxes size={18} /></div>
                <div className="stock-copy">
                  <div><strong>{item.name}</strong><span>{item.detail}</span></div>
                  <div className="stock-track"><i style={{ width: `${item.level}%` }} /></div>
                </div>
                <button type="button">Gestionar</button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">ACTIVIDAD</p>
              <h2>Últimos movimientos</h2>
            </div>
          </div>
          <ol className="activity-list">
            <li><i className="activity-dot activity-green" /><div><strong>Reserva confirmada</strong><span>María Rodríguez · hace 8 min</span></div></li>
            <li><i className="activity-dot activity-blue" /><div><strong>Documento procesado</strong><span>Autorización ARS · hace 21 min</span></div></li>
            <li><i className="activity-dot activity-amber" /><div><strong>Alerta enviada</strong><span>José Martínez · hace 34 min</span></div></li>
            <li><i className="activity-dot activity-slate" /><div><strong>Inventario conciliado</strong><span>Esperanza 70 · hace 1 h</span></div></li>
          </ol>
        </section>
      </div>
    </div>
  );
}
