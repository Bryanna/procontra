import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, ContactRound, IdCard, MessageCircle, Phone, ShieldCheck, UserRound } from "lucide-react";
import type { PatientListItem } from "@/modules/patients/patient-catalog";
import { formatPhoneNumber } from "@/shared/contact-format";

export function PatientRecordProfile({ patient }: { patient: PatientListItem }) {
  const initials = patient.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const followUpLabels = { green: "Seguimiento verde", yellow: "Seguimiento amarillo", red: "Seguimiento rojo", clinical: "Seguimiento rojo" } as const;
  const channelLabel = patient.preferredContactChannel === "call" ? "Llamada" : "WhatsApp";
  return (
    <div className="page-stack patient-page">
      <Link className="back-link" href="/pacientes"><ArrowLeft size={15} /> Volver a pacientes</Link>
      <section className="patient-hero panel">
        <div className="patient-avatar-large">{initials}</div>
        <div className="patient-identity">
          <div className="patient-title-line"><h1>{patient.name}</h1><span className={`status ${patient.active ? "status-emerald" : "status-slate"}`}>{patient.active ? "Activo" : "Inactivo"}</span></div>
          <div className="patient-meta-line"><span><UserRound size={14} /> {patient.code}</span><span><Phone size={14} /> {formatPhoneNumber(patient.phone)}</span><span><Building2 size={14} /> {patient.branch ? `${patient.branch}${patient.branchCode ? ` ${patient.branchCode}` : ""}` : "Sin sucursal preferida"}</span></div>
          <div className="patient-tags"><span><ShieldCheck size={13} /> {patient.consentStatus === "active" ? "Consentimiento vigente" : "Sin consentimiento vigente"}</span><span>{patient.insurer || "Aseguradora no informada"}</span><span><CalendarDays size={13} /> Registrado {new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(patient.joinedAt))}</span></div>
        </div>
      </section>
      <section className="panel patient-demographic-panel">
        <div className="panel-heading"><div><p className="section-kicker">IDENTIDAD PROTEGIDA</p><h2>Identificación y seguimiento</h2></div></div>
        <div className="patient-demographic-grid">
          <article><IdCard size={18} /><span><small>Cédula</small><strong>{patient.governmentIdMask ? `Cédula ${patient.governmentIdMask}` : "Cédula no informada"}</strong></span></article>
          <article><ContactRound size={18} /><span><small>Carnet del seguro</small><strong>{patient.insuranceCardMask ? `Carnet ${patient.insuranceCardMask}` : "Carnet no informado"}</strong></span></article>
          <article><CalendarDays size={18} /><span><small>Fecha de nacimiento</small><strong>{patient.birthDate ? new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${patient.birthDate}T00:00:00Z`)) : "No informada"}</strong></span></article>
          <article><Phone size={18} /><span><small>Validación de contacto</small><strong>{patient.phoneVerified ? "Teléfono verificado" : "Teléfono pendiente de verificar"}</strong></span></article>
          <article><ShieldCheck size={18} /><span><small>Estado operativo</small><strong>{followUpLabels[patient.followUpStatus]}</strong></span></article>
          <article><MessageCircle size={18} /><span><small>Comunicación</small><strong>Canal preferido: {channelLabel}</strong></span></article>
        </div>
      </section>
      <section className="panel patient-record-empty">
        <ShieldCheck size={24} />
        <div><p className="section-kicker">DATOS OPERATIVOS</p><h2>Perfil conectado al servidor</h2><p>Los tratamientos, dispensaciones y alertas aparecerán aquí cuando existan registros vinculados a este paciente.</p></div>
      </section>
    </div>
  );
}
