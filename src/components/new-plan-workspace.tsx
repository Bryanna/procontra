"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BellRing, CalendarClock, Check, CheckCircle2, ChevronRight, ClipboardCheck,
  FileText, History, MessageCircle, Phone, Pill, Plus, Search, ShieldCheck, Trash2, UserRound,
} from "lucide-react";
import { calculatePrescriptionSchedule, findInsurerRule, insurerRules } from "@/modules/follow-up/follow-up-rules";

export interface NewPlanPatientOption {
  id: string;
  code: string;
  name: string;
  phone: string;
  insurer: string | null;
  insuranceCardMask: string | null;
  branch: string | null;
  branchCode: string | null;
  phoneVerified?: boolean;
  preferredContactChannel?: string | null;
  consentStatus?: string | null;
}

interface MedicationDraft {
  id: string;
  medicine: string;
  concentration: string;
  presentation: string;
  directions: string;
  quantity: string;
  unitsPerDay: string;
}

type Step = "patient" | "prescription" | "alerts" | "review";

const steps: Array<{ id: Step; number: number; label: string; icon: typeof UserRound }> = [
  { id: "patient", number: 1, label: "Paciente", icon: UserRound },
  { id: "prescription", number: 2, label: "Receta", icon: FileText },
  { id: "alerts", number: 3, label: "Alertas", icon: BellRing },
  { id: "review", number: 4, label: "Revisar", icon: ClipboardCheck },
];

const emptyMedication = (id: string): MedicationDraft => ({ id, medicine: "", concentration: "", presentation: "", directions: "", quantity: "", unitsPerDay: "" });
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const formatDate = (value: string) => value ? new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "Pendiente";
const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(new Date());

function insurerCodeForPatient(insurer: string | null) {
  return insurer ? findInsurerRule(insurer)?.code ?? "" : "";
}

export function NewPlanWorkspace({
  initialPatients,
  cancelHref,
  actorLabel,
  branchLabel,
}: {
  initialPatients: NewPlanPatientOption[];
  cancelHref: string;
  actorLabel: string;
  branchLabel: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("patient");
  const stepIndex = steps.findIndex((item) => item.id === step);
  const [patients, setPatients] = useState(initialPatients);
  const [patientQuery, setPatientQuery] = useState("");
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [insurerCode, setInsurerCode] = useState("");
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const [firstPurchaseDate, setFirstPurchaseDate] = useState("");
  const [doctor, setDoctor] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"ars_rule" | "manual">("ars_rule");
  const [prescriptionCount, setPrescriptionCount] = useState("");
  const [currentPrescription, setCurrentPrescription] = useState("1");
  const [lastPurchaseDate, setLastPurchaseDate] = useState("");
  const [nextPurchaseDate, setNextPurchaseDate] = useState("");
  const [contactDate, setContactDate] = useState("");
  const [medications, setMedications] = useState<MedicationDraft[]>([emptyMedication("med-1")]);
  const [observations, setObservations] = useState("");
  const [callEnabled, setCallEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? initialPatients.find((patient) => patient.id === selectedPatientId);
  const query = normalize(patientQuery.trim());
  const localMatches = useMemo(() => patients.filter((patient) => normalize(`${patient.code} ${patient.name} ${patient.phone} ${patient.insurer ?? ""} ${patient.insuranceCardMask ?? ""} ${patient.branch ?? ""} ${patient.branchCode ?? ""}`).includes(query)).slice(0, 8), [patients, query]);
  const rule = insurerRules.find((item) => item.code === insurerCode);
  const automaticSchedule = useMemo(() => calculatePrescriptionSchedule(firstPurchaseDate, rule?.mode === "monthly" ? rule.prescriptionMonths : null), [firstPurchaseDate, rule]);
  const nextAutomatic = automaticSchedule.find((item) => item.number === 2) ?? automaticSchedule[0];
  const effectiveNextPurchase = scheduleMode === "manual" ? nextPurchaseDate : nextAutomatic?.prescriptionDate ?? "";
  const effectiveContactDate = scheduleMode === "manual" ? contactDate : nextAutomatic?.contactDate ?? "";
  const channels = [callEnabled ? "call" : null, whatsappEnabled ? "whatsapp" : null].filter(Boolean) as Array<"call" | "whatsapp">;

  useEffect(() => {
    if (query.length < 2 || localMatches.length > 0) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const response = await fetch(`/api/patients?q=${encodeURIComponent(patientQuery.trim())}&limit=8`, { signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (response.ok && Array.isArray(body.items)) setPatients(body.items);
      } finally {
        if (!controller.signal.aborted) setSearchingPatients(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [patientQuery, query, localMatches.length]);

  function selectPatient(patient: NewPlanPatientOption) {
    setSelectedPatientId(patient.id);
    setPatientQuery(patient.name);
    setInsurerCode(insurerCodeForPatient(patient.insurer));
    setCallEnabled(true);
    setWhatsappEnabled(patient.consentStatus === "granted" || patient.consentStatus === "active" || patient.consentStatus === "vigente");
    setError("");
  }

  function validateCurrentStep() {
    if (step === "patient" && !selectedPatient) return "Seleccione un paciente registrado para continuar.";
    if (step === "patient" && !insurerCode) return "Seleccione la ARS que rige esta receta.";
    if (step === "prescription") {
      if (!prescriptionDate || !firstPurchaseDate) return "Complete la fecha de la receta y la primera compra.";
      if (prescriptionDate > todayIso() || firstPurchaseDate > todayIso()) return "Las fechas de la receta y primera compra no pueden ser futuras.";
      if (!medications.some((item) => item.medicine.trim().length >= 2)) return "Agregue al menos un medicamento de la receta.";
      if (rule?.mode === "case_number" && caseNumber.trim().length < 2) return "Digite el número de caso de IDOPPRIL.";
      if (scheduleMode === "manual" && (!prescriptionCount || !nextPurchaseDate || !contactDate || !lastPurchaseDate)) return "Complete toda la programación manual.";
    }
    if (step === "alerts" && channels.length === 0) return "Seleccione llamada, WhatsApp o ambos canales.";
    return "";
  }

  function goForward() {
    const message = validateCurrentStep();
    if (message) { setError(message); return; }
    setError("");
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)].id);
  }

  function goBack() {
    setError("");
    setStep(steps[Math.max(stepIndex - 1, 0)].id);
  }

  function updateMedication(id: string, field: keyof Omit<MedicationDraft, "id">, value: string) {
    setMedications((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  async function submit() {
    const payload = {
      patientId: selectedPatientId,
      insurerCode,
      prescriptionNumber,
      prescriptionDate,
      firstPurchaseDate,
      doctor,
      caseNumber,
      scheduleMode,
      prescriptionCount,
      currentPrescription,
      lastPurchaseDate,
      nextPurchaseDate,
      contactDate,
      observations,
      reminderChannels: channels,
      reminderLeadDays: 3,
      prescriptionItems: medications.filter((item) => item.medicine.trim()).map((item) => ({
        medicine: item.medicine,
        concentration: item.concentration,
        presentation: item.presentation,
        directions: item.directions,
        quantity: item.quantity || null,
        unitsPerDay: item.unitsPerDay || null,
      })),
      medicines: medications.filter((item) => item.medicine.trim()).map((item) => [item.medicine, item.concentration, item.presentation].filter(Boolean).join(" ")).join("; "),
    };
    setSaving(true); setError("");
    const response = await fetch("/api/follow-up/plans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "No se pudo registrar la receta."); setSaving(false); return; }
    router.replace(`/programa?created=${body.id}`);
  }

  const previewDays = Array.from({ length: 3 }, (_, offset) => {
    const date = new Date(`${todayIso()}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    const iso = date.toISOString().slice(0, 10);
    return { iso, label: offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : "En 2 días", hasContact: effectiveContactDate === iso };
  });

  return <section className="followup-registration" aria-label="Registro interactivo de receta">
    <header className="followup-registration-header">
      <div><span className="eyebrow">RECETA Y CONTINUIDAD</span><h2>Registrar receta del paciente</h2><p>Convierta la receta en un seguimiento operativo con recordatorios por llamada y WhatsApp.</p></div>
      <span className="followup-registration-policy"><CalendarClock size={18}/><strong>Alerta institucional</strong><small>3 días antes de la próxima compra</small></span>
    </header>

    <nav className="followup-registration-stepper" aria-label="Pasos del registro">{steps.map((item, index) => {
      const Icon = item.icon;
      const complete = index < stepIndex;
      return <button type="button" key={item.id} aria-current={item.id === step ? "step" : undefined} disabled={index > stepIndex} data-complete={complete} onClick={() => index <= stepIndex && setStep(item.id)} aria-label={`${item.number} ${item.label}`}><span>{complete ? <Check size={16}/> : <Icon size={16}/>}</span><em>{item.number}. {item.label}</em></button>;
    })}</nav>

    <div className="followup-registration-progress"><span>Paso {stepIndex + 1} de 4</span><div><i style={{ width: `${((stepIndex + 1) / 4) * 100}%` }}/></div></div>

    <div className="followup-registration-layout">
      <main className="followup-registration-main">
        {step === "patient" && <section className="followup-registration-section" aria-labelledby="registration-patient-title">
          <div className="followup-registration-section-title"><span><UserRound size={20}/></span><div><h3 id="registration-patient-title">¿A quién pertenece la receta?</h3><p>Busque por nombre, código, teléfono, ARS, carnet o sucursal.</p></div></div>
          <label className="followup-registration-search"><span>Buscar paciente <b>*</b></span><div><Search size={18}/><input aria-label="Buscar paciente" type="search" value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} placeholder="Ej.: Ana Pérez, PAC-0001 o 809…" autoComplete="off"/></div></label>
          {selectedPatient ? <article className="followup-registration-patient-card"><span className="followup-patient-avatar">{selectedPatient.name.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</span><div><small>Paciente seleccionado</small><h4>{selectedPatient.name}</h4><p>{selectedPatient.code} · {selectedPatient.phone}</p><div className="followup-registration-badges"><span className={selectedPatient.phoneVerified ? "is-positive" : "is-warning"}>{selectedPatient.phoneVerified ? "Teléfono verificado" : "Teléfono sin verificar"}</span><span className={whatsappEnabled ? "is-positive" : "is-warning"}>{whatsappEnabled ? "Consentimiento vigente" : "WhatsApp pendiente de consentimiento"}</span><span>{selectedPatient.preferredContactChannel === "whatsapp" ? "WhatsApp preferido" : "Llamada preferida"}</span></div><p>{selectedPatient.insurer ?? "Sin ARS"}{selectedPatient.insuranceCardMask ? ` · Carnet ${selectedPatient.insuranceCardMask}` : ""} · {selectedPatient.branch ?? "Sin sucursal"} {selectedPatient.branchCode ?? ""}</p></div><button type="button" onClick={() => { setSelectedPatientId(""); setPatientQuery(""); setInsurerCode(""); }}>Cambiar paciente</button></article> : <div className="followup-registration-patient-list" aria-label="Resultados de pacientes">{searchingPatients && <p role="status">Buscando pacientes…</p>}{localMatches.map((patient) => <button type="button" key={patient.id} aria-label={`Seleccionar ${patient.name}`} onClick={() => selectPatient(patient)}><span className="followup-patient-avatar">{patient.name.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</span><span><strong>{patient.name}</strong><small>{patient.code} · {patient.phone}</small><small>{patient.insurer ?? "Sin ARS"}{patient.insuranceCardMask ? ` · Carnet ${patient.insuranceCardMask}` : ""}</small><small>{patient.branch ?? "Sin sucursal"} {patient.branchCode ?? ""}</small></span><ChevronRight size={17}/></button>)}</div>}
          {!selectedPatient && query.length >= 2 && !searchingPatients && localMatches.length === 0 && <div className="followup-registration-empty"><UserRound size={22}/><span><strong>No encontramos ese paciente.</strong><small>Pruebe otro dato o regístrelo antes de continuar.</small></span></div>}
          <div className="followup-registration-inline-action"><Link href="/pacientes"><Plus size={16}/>Registrar paciente nuevo</Link></div>
          <div className="followup-registration-fields"><label><span>ARS / aseguradora <b>*</b></span><select aria-label="ARS / aseguradora" value={insurerCode} onChange={(event) => setInsurerCode(event.target.value)}><option value="">Seleccione la cobertura</option>{insurerRules.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><div className="followup-registration-rule"><ShieldCheck size={18}/><span><small>Regla de cobertura</small><strong>{rule ? rule.mode === "case_number" ? "Seguimiento por caso" : `${rule.prescriptionMonths} recetas mensuales` : "Se define al seleccionar la ARS"}</strong></span></div></div>
        </section>}

        {step === "prescription" && <section className="followup-registration-section" aria-labelledby="registration-prescription-title">
          <div className="followup-registration-section-title"><span><FileText size={20}/></span><div><h3 id="registration-prescription-title">Capture la receta</h3><p>Registre la evidencia operativa y cada medicamento por separado.</p></div></div>
          <div className="followup-registration-fields"><label><span>Número de receta</span><input aria-label="Número de receta" value={prescriptionNumber} onChange={(event) => setPrescriptionNumber(event.target.value)} placeholder="RX-2026-001"/></label><label><span>Fecha de receta <b>*</b></span><input aria-label="Fecha de receta" type="date" max={todayIso()} value={prescriptionDate} onChange={(event) => setPrescriptionDate(event.target.value)}/></label><label><span>Fecha de primera compra <b>*</b></span><input aria-label="Fecha de primera compra" type="date" max={todayIso()} value={firstPurchaseDate} onChange={(event) => { setFirstPurchaseDate(event.target.value); if (!lastPurchaseDate) setLastPurchaseDate(event.target.value); }}/></label><label><span>Médico</span><input aria-label="Médico" value={doctor} onChange={(event) => setDoctor(event.target.value)} placeholder="Nombre del médico"/></label>{rule?.mode === "case_number" && <label className="followup-registration-wide"><span>Número de caso IDOPPRIL <b>*</b></span><input aria-label="Número de caso IDOPPRIL" value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)}/></label>}</div>
          <div className="followup-medication-list"><header><div><Pill size={19}/><span><strong>Medicamentos indicados</strong><small>Nombre, concentración, presentación e indicaciones.</small></span></div><button type="button" onClick={() => setMedications((items) => [...items, emptyMedication(`med-${Date.now()}`)])}><Plus size={16}/>Agregar medicamento</button></header>{medications.map((item, index) => <article className="followup-medication-row" key={item.id}><div className="followup-medication-row-heading"><strong>Medicamento {index + 1}</strong>{medications.length > 1 && <button type="button" aria-label={`Eliminar medicamento ${index + 1}`} onClick={() => setMedications((items) => items.filter((candidate) => candidate.id !== item.id))}><Trash2 size={16}/></button>}</div><div className="followup-registration-fields"><label><span>Medicamento <b>*</b></span><input aria-label={`Medicamento ${index + 1}`} value={item.medicine} onChange={(event) => updateMedication(item.id, "medicine", event.target.value)} placeholder="Ej.: Losartán"/></label><label><span>Concentración</span><input aria-label={`Concentración ${index + 1}`} value={item.concentration} onChange={(event) => updateMedication(item.id, "concentration", event.target.value)} placeholder="50 mg"/></label><label><span>Presentación</span><input aria-label={`Presentación ${index + 1}`} value={item.presentation} onChange={(event) => updateMedication(item.id, "presentation", event.target.value)} placeholder="30 tabletas"/></label><label><span>Cantidad</span><input aria-label={`Cantidad ${index + 1}`} type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => updateMedication(item.id, "quantity", event.target.value)}/></label><label className="followup-registration-wide"><span>Indicaciones de la receta</span><input aria-label={`Indicaciones ${index + 1}`} value={item.directions} onChange={(event) => updateMedication(item.id, "directions", event.target.value)} placeholder="Información visible en la receta; no inferir datos clínicos"/></label></div></article>)}</div>
          {rule?.mode === "monthly" && <div className="followup-schedule-builder"><header><CalendarClock size={19}/><span><strong>Programación del seguimiento</strong><small>PROCONTRA alertará 3 días antes de cada compra.</small></span></header><label><span>Forma de programación</span><select aria-label="Modo de programación" value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value as "ars_rule" | "manual")}><option value="ars_rule">Automática según regla de la ARS</option><option value="manual">Programación digitada</option></select></label>{scheduleMode === "manual" ? <div className="followup-registration-fields"><label><span>Cantidad de recetas</span><input aria-label="Cantidad de recetas" type="number" min="1" max="24" value={prescriptionCount} onChange={(event) => setPrescriptionCount(event.target.value)}/></label><label><span>Receta actual</span><input aria-label="Receta actual" type="number" min="1" max="24" value={currentPrescription} onChange={(event) => setCurrentPrescription(event.target.value)}/></label><label><span>Última compra</span><input aria-label="Última compra" type="date" value={lastPurchaseDate} onChange={(event) => setLastPurchaseDate(event.target.value)}/></label><label><span>Próxima compra</span><input aria-label="Próxima compra" type="date" value={nextPurchaseDate} onChange={(event) => setNextPurchaseDate(event.target.value)}/></label><label><span>Fecha de contacto</span><input aria-label="Fecha de contacto" type="date" value={contactDate} onChange={(event) => setContactDate(event.target.value)}/></label></div> : <div className="followup-schedule-preview"><span><small>Recetas</small><strong>{rule.prescriptionMonths}</strong></span><span><small>Próxima compra</small><strong>{formatDate(effectiveNextPurchase)}</strong></span><span><small>Primer contacto</small><strong>{formatDate(effectiveContactDate)}</strong></span></div>}</div>}
        </section>}

        {step === "alerts" && <section className="followup-registration-section" aria-labelledby="registration-alerts-title">
          <div className="followup-registration-section-title"><span><BellRing size={20}/></span><div><h3 id="registration-alerts-title">¿Cómo realizaremos el recordatorio?</h3><p>La agenda interna siempre se crea. Seleccione los canales de contacto.</p></div></div>
          <div className="followup-alert-channel-grid"><label className={callEnabled ? "is-selected" : ""}><input type="checkbox" aria-label="Recordar por llamada" checked={callEnabled} onChange={(event) => setCallEnabled(event.target.checked)}/><span><Phone size={22}/><strong>Llamada</strong><small>El personal llamará al paciente y registrará el resultado.</small></span><CheckCircle2 size={18}/></label><label className={whatsappEnabled ? "is-selected" : ""}><input type="checkbox" aria-label="Recordar por WhatsApp" checked={whatsappEnabled} disabled={!selectedPatient || !selectedPatient.phoneVerified || !["granted", "active", "vigente"].includes(selectedPatient.consentStatus ?? "")} onChange={(event) => setWhatsappEnabled(event.target.checked)}/><span><MessageCircle size={22}/><strong>WhatsApp</strong><small>{selectedPatient?.phoneVerified ? "Mensaje operativo con consentimiento vigente." : "Requiere teléfono verificado y consentimiento."}</small></span><CheckCircle2 size={18}/></label></div>
          <div className="followup-three-day-preview"><header><div><CalendarClock size={19}/><span><h3>Impacto en los próximos 3 días</h3><p>Vista de la cola operativa desde hoy.</p></span></div><strong>{formatDate(effectiveContactDate)}</strong></header><div>{previewDays.map((day) => <article key={day.iso} className={day.hasContact ? "has-contact" : "is-empty"}><span><strong>{day.label}</strong><small>{formatDate(day.iso)}</small></span>{day.hasContact ? <em><BellRing size={15}/>Se agregará a la agenda</em> : <em>Sin contacto programado</em>}</article>)}</div>{!previewDays.some((day) => day.hasContact) && <p>Este plan no agrega contactos a los próximos 3 días. Primer contacto previsto: <strong>{formatDate(effectiveContactDate)}</strong>.</p>}</div>
          <label className="followup-registration-notes"><span>Observaciones operativas</span><textarea rows={4} value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Barreras de acceso, horario preferido o información útil para el seguimiento"/></label>
        </section>}

        {step === "review" && <section className="followup-registration-section" aria-labelledby="registration-review-title">
          <div className="followup-registration-section-title"><span><ClipboardCheck size={20}/></span><div><h3 id="registration-review-title">Revise antes de registrar</h3><p>Confirme que la receta, la programación y los canales son correctos.</p></div></div>
          <div className="followup-review-grid"><article><header><UserRound size={17}/><strong>Paciente</strong><button type="button" onClick={() => setStep("patient")}>Editar</button></header><h4>{selectedPatient?.name}</h4><p>{selectedPatient?.code} · {selectedPatient?.phone}</p><p>{rule?.name}</p></article><article><header><Pill size={17}/><strong>Receta</strong><button type="button" onClick={() => setStep("prescription")}>Editar</button></header><h4>{prescriptionNumber || "Sin número externo"}</h4><p>{formatDate(prescriptionDate)} · {medications.filter((item) => item.medicine.trim()).length} medicamento(s)</p><p>{medications.filter((item) => item.medicine.trim()).map((item) => item.medicine).join(", ")}</p></article><article><header><BellRing size={17}/><strong>Seguimiento</strong><button type="button" onClick={() => setStep("alerts")}>Editar</button></header><h4>{channels.map((channel) => channel === "call" ? "Llamada" : "WhatsApp").join(" y ")}</h4><p>Contacto 3 días antes de la compra.</p><p>Próximo contacto: {formatDate(effectiveContactDate)}</p></article></div>
          <div className="followup-traceability-preview"><header><History size={19}/><span><h3>Trazabilidad que se registrará</h3><p>El historial será append-only: cada gestión conservará quién, cuándo, canal, resultado y próxima acción.</p></span></header><ol><li><span><CheckCircle2 size={16}/></span><div><strong>Alta de receta y programa</strong><small>{actorLabel} · {branchLabel} · fecha y hora del servidor</small></div></li><li><span><BellRing size={16}/></span><div><strong>Agenda inicial</strong><small>{formatDate(effectiveContactDate)} · {channels.map((channel) => channel === "call" ? "Llamada" : "WhatsApp").join(" y ")}</small></div></li><li><span><History size={16}/></span><div><strong>Seguimientos posteriores</strong><small>Llamadas, WhatsApp, respuestas, compromisos, compras y próxima acción.</small></div></li></ol></div>
        </section>}

        {error && <p className="form-error followup-registration-error" role="alert">{error}</p>}
        <footer className="followup-registration-actions"><div>{stepIndex > 0 ? <button type="button" className="followup-btn followup-btn-secondary" onClick={goBack}><ArrowLeft size={17}/>Atrás</button> : <Link className="followup-btn followup-btn-secondary" href={cancelHref}>Cancelar</Link>}</div>{step !== "review" ? <button type="button" className="followup-btn followup-btn-primary" onClick={goForward}>Guardar y continuar<ChevronRight size={17}/></button> : <button type="button" className="followup-btn followup-btn-primary" disabled={saving} onClick={submit}><ClipboardCheck size={17}/>{saving ? "Registrando…" : "Registrar receta y seguimiento"}</button>}</footer>
      </main>

      <aside className="followup-registration-aside"><div className="followup-registration-summary"><span className="eyebrow">RESUMEN EN VIVO</span><h3>{selectedPatient?.name ?? "Seleccione un paciente"}</h3><dl><div><dt>ARS</dt><dd>{rule?.name ?? "Pendiente"}</dd></div><div><dt>Receta</dt><dd>{prescriptionNumber || "Pendiente"}</dd></div><div><dt>Medicamentos</dt><dd>{medications.filter((item) => item.medicine.trim()).length}</dd></div><div><dt>Próxima compra</dt><dd>{formatDate(effectiveNextPurchase)}</dd></div><div><dt>Contacto</dt><dd>{formatDate(effectiveContactDate)}</dd></div><div><dt>Canales</dt><dd>{channels.length ? channels.map((channel) => channel === "call" ? "Llamada" : "WhatsApp").join(" + ") : "Pendiente"}</dd></div></dl><div className="followup-registration-summary-note"><ShieldCheck size={17}/><span>La receta no autoriza cambios clínicos. El seguimiento es operativo y toda gestión quedará trazada.</span></div></div></aside>
    </div>
  </section>;
}
