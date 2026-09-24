"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Fingerprint, HeartPulse, IdCard, Pencil, Phone, ShieldCheck, X } from "lucide-react";
import type { InventoryBranch } from "@/modules/inventory/inventory-catalog";
import type { PatientListItem } from "@/modules/patients/patient-catalog";
import { acceptedPatientInsurers } from "@/modules/patients/patient-registration";
import { digitsOnly, formatPhoneNumber } from "@/shared/contact-format";

export function EditPatientDialog({ patient, branches, onClose }: { patient: PatientListItem; branches: InventoryBranch[]; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [governmentId, setGovernmentId] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [identifiersLoading, setIdentifiersLoading] = useState(true);
  const [phone, setPhone] = useState(() => formatPhoneNumber(patient.phone));
  const branchId = branches.find((item) => item.code === patient.branchCode)?.id ?? "";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [busy, onClose]);

  useEffect(() => {
    let active = true;
    fetch(`/api/patients/${patient.id}`)
      .then(async (response) => {
        const payload = await response.json() as { error?: string; governmentId?: string; insurancePolicy?: string };
        if (!response.ok) throw new Error(payload.error || "No fue posible consultar los identificadores");
        if (!active) return;
        setGovernmentId(digitsOnly(payload.governmentId, 11));
        setInsurancePolicy(digitsOnly(payload.insurancePolicy, 12));
      })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "No fue posible consultar los identificadores"); })
      .finally(() => { if (active) setIdentifiersLoading(false); });
    return () => { active = false; };
  }, [patient.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const governmentId = String(form.get("governmentId") ?? "");
    const insuranceCard = String(form.get("insuranceCard") ?? "");
    const phone = String(form.get("phone") ?? "");
    const governmentIdDigits = governmentId.replace(/\D/g, "");
    const phoneDigits = phone.replace(/\D/g, "");
    try {
      if (governmentIdDigits && governmentIdDigits.length !== 11) throw new Error("La nueva cédula debe contener 11 dígitos");
      if (phoneDigits.length !== 10) throw new Error("El teléfono debe contener 10 dígitos");
      let response: Response;
      try {
        response = await fetch(`/api/patients/${patient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"), governmentId, insuranceCard,
            birthDate: form.get("birthDate"), phone, phoneVerified: form.get("phoneVerified") === "on",
            insurer: form.get("insurer"), followUpStatus: form.get("followUpStatus"),
            preferredContactChannel: form.get("preferredContactChannel"), branchId: form.get("branchId"),
            active: form.get("active") === "active",
          }),
        });
      } catch {
        throw new Error("No fue posible conectar con el servidor. Intente nuevamente.");
      }
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible actualizar el paciente");
      onClose();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible actualizar el paciente");
    } finally {
      setBusy(false);
    }
  }

  return <div className="product-dialog-backdrop" role="presentation">
    <section aria-labelledby="edit-patient-title" aria-modal="true" className="product-dialog patient-dialog" role="dialog">
      <header className="patient-dialog-header"><div className="product-dialog-title"><span><Pencil size={20} /></span><div><p className="section-kicker">EDITAR REGISTRO</p><h2 id="edit-patient-title">Editar paciente {patient.name}</h2><p>La cédula y la póliza actuales se muestran para su revisión. Cada sustitución conserva el valor anterior cifrado en el historial.</p></div></div><button aria-label="Cerrar" className="icon-button" disabled={busy} onClick={onClose} type="button"><X size={18} /></button></header>
      <form className="patient-registration-form" onSubmit={submit}>
        <section className="patient-registration-scope" aria-labelledby="edit-patient-scope-title">
          <div className="patient-section-title"><span><Building2 size={18} /></span><div><h3 id="edit-patient-scope-title">Sucursal e identificación</h3><p>Ubicación operativa del registro.</p></div></div>
          <div className="patient-scope-grid">
            <label><span>Sucursal <b>*</b></span><select aria-label="Sucursal" defaultValue={branchId} name="branchId" required><option value="">Seleccione una sucursal</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} {branch.code}</option>)}</select></label>
            <label className="patient-active-check"><input aria-label="Activo" defaultChecked={patient.active} name="active" type="checkbox" value="active" /><span><strong>Activo</strong><small>Disponible para atención y seguimiento.</small></span></label>
            <div className="patient-internal-id patient-scope-wide"><Fingerprint size={19} /><span><strong>ID interno</strong><small>{patient.code}</small></span></div>
          </div>
        </section>
        <section className="patient-registration-section" aria-labelledby="edit-patient-identity-title">
          <div className="patient-section-title"><span><IdCard size={18} /></span><div><h3 id="edit-patient-identity-title">Cédula y póliza</h3><p>Puede corregir cualquiera de los dos identificadores; el sistema conservará el valor anterior.</p></div></div>
          <div className="patient-form-grid patient-form-grid-three">
            <label className="patient-field-wide"><span>Nombre completo <b>*</b></span><input aria-label="Nombre completo" defaultValue={patient.name} maxLength={240} name="name" required /></label>
            <label><span>Cédula <em>11 dígitos</em></span><input aria-label="Cédula" disabled={identifiersLoading} inputMode="numeric" maxLength={11} name="governmentId" onChange={(event) => setGovernmentId(digitsOnly(event.target.value, 11))} placeholder={identifiersLoading ? "Consultando…" : "00112345678"} value={governmentId} /><small>{patient.governmentIdMask ? `Cédula actual: ${patient.governmentIdMask}` : "Cédula no registrada"}</small></label>
            <label><span>Póliza <em>8 a 12 dígitos</em></span><input aria-label="Póliza" disabled={identifiersLoading} inputMode="numeric" maxLength={12} name="insuranceCard" onChange={(event) => setInsurancePolicy(digitsOnly(event.target.value, 12))} placeholder={identifiersLoading ? "Consultando…" : "Número de póliza"} value={insurancePolicy} /><small>{patient.insuranceCardMask ? `Póliza actual: ${patient.insuranceCardMask}` : "Póliza no registrada"}</small></label>
            <label><span>Fecha de nacimiento <em>Opcional</em></span><input aria-label="Fecha de nacimiento" defaultValue={patient.birthDate ?? ""} max="2099-12-31" min="1900-01-01" name="birthDate" type="date" /></label>
          </div>
        </section>
        <section className="patient-registration-section" aria-labelledby="edit-patient-contact-title">
          <div className="patient-section-title"><span><Phone size={18} /></span><div><h3 id="edit-patient-contact-title">Contacto y cobertura</h3><p>Información activa para el seguimiento.</p></div></div>
          <div className="patient-form-grid patient-form-grid-three">
            <label><span>ARS / aseguradora <em>Opcional</em></span><select aria-label="ARS / aseguradora" defaultValue={patient.insurer ?? ""} name="insurer"><option value="">Sin ARS informada</option>{acceptedPatientInsurers.map((insurer) => <option key={insurer} value={insurer}>{insurer}</option>)}</select></label>
            <label><span>Teléfono <b>*</b></span><input aria-label="Teléfono" inputMode="numeric" maxLength={12} name="phone" onChange={(event) => setPhone(formatPhoneNumber(event.target.value))} required value={phone} /><small>Formato 809-555-0000.</small></label>
            <label><span>Canal preferido</span><select aria-label="Canal preferido" defaultValue={patient.preferredContactChannel} name="preferredContactChannel"><option value="whatsapp">WhatsApp</option><option value="call">Llamada</option></select></label>
            <label className="patient-field-wide"><span>Estado de seguimiento</span><select aria-label="Estado de seguimiento" defaultValue={patient.followUpStatus} name="followUpStatus"><option value="green">Verde · continuidad organizada</option><option value="yellow">Amarillo · requiere seguimiento</option><option value="red">Rojo · riesgo de interrupción</option><option value="clinical">Escalamiento profesional</option></select></label>
          </div>
        </section>
        <section className="patient-registration-section patient-registration-confirmations" aria-labelledby="edit-patient-validation-title">
          <div className="patient-section-title"><span><ShieldCheck size={18} /></span><div><h3 id="edit-patient-validation-title">Validación</h3><p>Confirme solo cuando el número haya sido verificado.</p></div></div>
          <div className="patient-confirmation-grid"><label className="patient-confirmation"><input aria-label="Teléfono verificado" defaultChecked={patient.phoneVerified} name="phoneVerified" type="checkbox" /><span><strong>Teléfono verificado</strong><small>El número pertenece al paciente.</small></span></label></div>
        </section>
        {error && <div className="staff-feedback staff-feedback-error" role="alert">{error}</div>}
        <footer className="patient-dialog-footer"><span><HeartPulse size={16} /> Los cambios de cédula o póliza quedarán en el historial protegido.</span><div><button className="button button-secondary" disabled={busy} onClick={onClose} type="button">Cancelar</button><button className="button button-primary" disabled={busy || identifiersLoading} type="submit"><Pencil size={16} /> {busy ? "Guardando…" : identifiersLoading ? "Consultando datos…" : "Guardar cambios"}</button></div></footer>
      </form>
    </section>
  </div>;
}