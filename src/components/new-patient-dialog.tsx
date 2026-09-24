"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Fingerprint, HeartPulse, IdCard, Phone, Plus, ShieldCheck, UserPlus, X } from "lucide-react";
import type { InventoryBranch } from "@/modules/inventory/inventory-catalog";
import { acceptedPatientInsurers } from "@/modules/patients/patient-registration";
import { digitsOnly, formatPhoneNumber } from "@/shared/contact-format";
import { PatientFollowUpField } from "./patient-follow-up-field";

export function NewPatientDialog({ branches }: { branches: InventoryBranch[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [governmentId, setGovernmentId] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [open, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const governmentIdDigits = String(form.get("governmentId") ?? "").replace(/\D/g, "");
      const phoneDigits = String(form.get("phone") ?? "").replace(/\D/g, "");
      if (governmentIdDigits && governmentIdDigits.length !== 11) throw new Error("La cédula debe contener 11 dígitos");
      if (phoneDigits.length !== 10) throw new Error("El teléfono debe contener 10 dígitos");
      let response: Response;
      try {
        response = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            governmentId: form.get("governmentId"),
            insuranceCard: form.get("insuranceCard"),
            birthDate: form.get("birthDate"),
            phone: form.get("phone"),
            phoneVerified: form.get("phoneVerified") === "on",
            insurer: form.get("insurer"),
            followUpStatus: form.get("followUpStatus"),
            preferredContactChannel: form.get("preferredContactChannel"),
            branchId: form.get("branchId"),
            consentGranted: form.get("consentGranted") === "on",
          }),
        });
      } catch {
        throw new Error("No fue posible conectar con el servidor. Intente nuevamente.");
      }
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible registrar el paciente");
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible registrar el paciente");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button className="button button-primary" onClick={() => setOpen(true)} type="button"><Plus size={17} /> Registrar nuevo paciente</button>
    {open && <div className="product-dialog-backdrop" role="presentation">
      <section aria-labelledby="new-patient-title" aria-modal="true" className="product-dialog patient-dialog" role="dialog">
        <header className="patient-dialog-header"><div className="product-dialog-title"><span><UserPlus size={20} /></span><div><p className="section-kicker">NUEVO PACIENTE</p><h2 id="new-patient-title">Registrar nuevo paciente</h2><p>Complete los datos disponibles; cédula, carnet y ARS pueden agregarse cuando el paciente los facilite.</p></div></div><button aria-label="Cerrar" className="icon-button" disabled={busy} onClick={() => setOpen(false)} type="button"><X size={18} /></button></header>
        <form className="patient-registration-form" onSubmit={submit}>
          <section className="patient-registration-scope" aria-labelledby="patient-scope-title">
            <div className="patient-section-title"><span><Building2 size={18} /></span><div><h3 id="patient-scope-title">Sucursal e identificación interna</h3><p>Seleccione primero dónde será atendido el paciente.</p></div></div>
            <div className="patient-scope-grid">
              <label><span>Sucursal <b>*</b></span><select aria-label="Sucursal" autoFocus name="branchId" required><option value="">Seleccione una sucursal</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} {branch.code}</option>)}</select></label>
              <div className="patient-internal-id"><Fingerprint size={19} /><span><strong>ID interno · se asigna automáticamente</strong><small>El sistema lo crea al guardar; el usuario no tiene que escribirlo.</small></span></div>
            </div>
          </section>

          <section className="patient-registration-section" aria-labelledby="patient-identity-title">
            <div className="patient-section-title"><span><IdCard size={18} /></span><div><h3 id="patient-identity-title">Datos del paciente</h3><p>Registre solamente información confirmada.</p></div></div>
            <div className="patient-form-grid">
              <label className="patient-field-wide"><span>Nombre completo <b>*</b></span><input aria-label="Nombre completo" autoComplete="name" maxLength={240} name="name" required /></label>
              <label><span>Cédula del paciente <em>Opcional</em></span><input aria-describedby="patient-government-id-help" aria-label="Cédula del paciente" autoComplete="off" inputMode="numeric" maxLength={11} name="governmentId" onChange={(event) => setGovernmentId(digitsOnly(event.target.value, 11))} placeholder="00112345678" value={governmentId} /><small id="patient-government-id-help">Debe contener exactamente 11 dígitos numéricos.</small></label>
              <label><span>Fecha de nacimiento <em>Opcional</em></span><input aria-label="Fecha de nacimiento" max="2099-12-31" min="1900-01-01" name="birthDate" type="date" /></label>
            </div>
          </section>

          <section className="patient-registration-section" aria-labelledby="patient-contact-title">
            <div className="patient-section-title"><span><Phone size={18} /></span><div><h3 id="patient-contact-title">Contacto y cobertura</h3><p>Información para continuidad y comunicación autorizada.</p></div></div>
            <div className="patient-form-grid">
              <label className="patient-field-wide"><span>Teléfono <b>*</b></span><input aria-describedby="patient-phone-help" aria-label="Teléfono" autoComplete="tel" inputMode="numeric" maxLength={12} name="phone" onChange={(event) => setPhone(formatPhoneNumber(event.target.value))} placeholder="809-555-0000" required value={phone} /><small id="patient-phone-help">Digite 10 números; se mostrará como 809-555-0000.</small></label>
              <label><span>ARS / aseguradora <em>Opcional</em></span><select aria-label="ARS / aseguradora" name="insurer"><option value="">Sin ARS informada</option>{acceptedPatientInsurers.map((insurer) => <option key={insurer} value={insurer}>{insurer}</option>)}</select></label>
              <label><span>Carnet <em>Opcional</em></span><input aria-label="Carnet" autoComplete="off" inputMode="numeric" maxLength={15} name="insuranceCard" placeholder="Número de carnet" /><small>Debe contener de 8 a 12 dígitos.</small></label>
              <label><span>Canal preferido</span><select aria-label="Canal preferido" defaultValue="whatsapp" name="preferredContactChannel"><option value="whatsapp">WhatsApp</option><option value="call">Llamada</option></select></label>
              <PatientFollowUpField />
            </div>
          </section>

          <section className="patient-registration-section patient-registration-confirmations" aria-labelledby="patient-permissions-title">
            <div className="patient-section-title"><span><ShieldCheck size={18} /></span><div><h3 id="patient-permissions-title">Validaciones</h3><p>Estas opciones deben reflejar confirmaciones reales.</p></div></div>
            <div className="patient-confirmation-grid">
              <label className="patient-confirmation"><input aria-label="Teléfono verificado" name="phoneVerified" type="checkbox" /><span><strong>Teléfono verificado</strong><small>El número pertenece al paciente.</small></span></label>
              <label className="patient-confirmation"><input aria-label="Consentimiento vigente" name="consentGranted" type="checkbox" /><span><strong>Consentimiento vigente</strong><small>Autorizó comunicaciones de continuidad.</small></span></label>
            </div>
          </section>
          {error && <div className="staff-feedback staff-feedback-error" role="alert">{error}</div>}
          <footer className="patient-dialog-footer"><span><HeartPulse size={16} /> El registro quedará disponible para seguimiento.</span><div><button className="button button-secondary" disabled={busy} onClick={() => setOpen(false)} type="button">Cancelar</button><button className="button button-primary" disabled={busy} type="submit"><UserPlus size={16} /> {busy ? "Guardando…" : "Guardar paciente"}</button></div></footer>
        </form>
      </section>
    </div>}
  </>;
}
