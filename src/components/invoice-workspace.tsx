"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { FileCheck2, FileImage, Plus, Save, ShieldCheck, Trash2, Upload } from "lucide-react";
import type { InsuranceAuthorizationSuggestion } from "@/modules/documents/invoice-ocr";
import { digitsOnly, formatPhoneNumber } from "@/shared/contact-format";

type Branch = { id: string; code: string; name: string };
type Line = { id: string; number: number; description: string; code: string | null; quantity: number; lot: string | null; expiry: string | null; status: string; productName: string | null };
type Invoice = { id: string; reference: string | null; type: string; channel: string; status: string; createdAt: string; lines: Line[] };
type Authorization = { id: string; reference: string; insurer: string; patientName: string; prescriptionNumber: string; status: string; createdAt: string; medicines: Array<{ id: string; description: string; quantity: number; status: string }> };
type Profile = { id: string; name: string; role: string };
type Insurer = { code: string; name: string };
type EditableLine = ReturnType<typeof blankLine>;

const blankLine = () => ({ description: "", code: "", barcode: "", quantity: "", unit: "", unitCost: "", lot: "", expiryDate: "" });
const blankAuthorization = (): InsuranceAuthorizationSuggestion => ({
  insurerCode: "", insurerName: "", patientName: "", governmentId: "", insuranceCard: "", phone: "",
  authorizationNumber: "", authorizationDate: "", prescriber: "", authorized: false, continuousUse: false, medicines: [],
});

export function InvoiceWorkspace({ branches, invoices, authorizations = [], insurers = [], profiles, isAdmin }: {
  branches: Branch[];
  invoices: Invoice[];
  authorizations?: Authorization[];
  insurers?: Insurer[];
  profiles: Profile[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState("purchase");
  const [lines, setLines] = useState<EditableLine[]>([blankLine()]);
  const [authorization, setAuthorization] = useState(blankAuthorization());
  const [authorized, setAuthorized] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [callReminder, setCallReminder] = useState(true);
  const [whatsappReminder, setWhatsappReminder] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isAuthorization = documentType === "insurance_authorization";
  const maximumDocumentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const updateLine = (index: number, key: keyof EditableLine, value: string) => setLines((current) => current.map((line, position) => position === index ? { ...line, [key]: value } : line));
  const updateAuthorization = (key: keyof InsuranceAuthorizationSuggestion, value: string | boolean) => setAuthorization((current) => ({ ...current, [key]: value }));

  async function extractText() {
    const file = fileInput.current?.files?.[0];
    if (!file) { setMessage("Seleccione primero una fotografía."); return; }
    setOcrBusy(true); setMessage("");
    const payload = new FormData(); payload.set("file", file);
    try {
      const response = await fetch("/api/documents/invoices/extract", { method: "POST", body: payload });
      const data = await response.json() as { error?: string; lines?: EditableLine[]; authorization?: InsuranceAuthorizationSuggestion };
      if (!response.ok) throw new Error(data.error || "No fue posible extraer el texto");
      if (data.authorization?.patientName || data.authorization?.authorizationNumber) {
        setDocumentType("insurance_authorization");
        setAuthorization(data.authorization);
        setAuthorized(data.authorization.authorized);
        setLines(data.authorization.medicines.length ? data.authorization.medicines.map((item) => ({ ...blankLine(), description: item.medicine, quantity: item.quantity })) : [blankLine()]);
        setMessage("Datos extraídos. Confirme cada campo visible, el estado autorizado, el consentimiento y los medicamentos antes de registrar.");
      } else if (data.lines?.length) {
        setLines(data.lines);
        setMessage("Texto extraído. Revise descripción, código, cantidad, lote y vencimiento antes de guardar.");
      } else throw new Error("No se detectaron datos suficientes; complételos manualmente.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible extraer el texto"); }
    finally { setOcrBusy(false); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload = new FormData();
    payload.set("file", values.get("file") as File);
    const branchId = String(values.get("branchId") ?? "");
    const endpoint = isAuthorization ? "/api/documents/authorizations" : "/api/documents/invoices";
    const metadata = isAuthorization ? {
      source: "web", branchId,
      ...authorization,
      insurerCode: String(values.get("insurerCode") ?? authorization.insurerCode),
      insurerName: insurers.find((insurer) => insurer.code === String(values.get("insurerCode")))?.name ?? authorization.insurerName,
      authorized, continuousUse: authorization.continuousUse, consentGranted,
      reminderChannels: [callReminder ? "call" : "", whatsappReminder ? "whatsapp" : ""].filter(Boolean),
      medicines: lines.map((line) => ({ medicine: line.description, quantity: line.quantity })),
    } : {
      source: "web", documentType, branchId, reference: values.get("reference"),
      lines: lines.map((line) => ({ ...line, quantity: Number(line.quantity), unitCost: line.unitCost ? Number(line.unitCost) : null })),
    };
    payload.set("metadata", JSON.stringify(metadata));
    try {
      const response = await fetch(endpoint, { method: "POST", body: payload });
      const data = await response.json() as { error?: string; created?: boolean };
      if (!response.ok) throw new Error(data.error || "No fue posible registrar el documento");
      setLines([blankLine()]); setAuthorization(blankAuthorization()); setAuthorized(false); setConsentGranted(false); form.reset();
      setDocumentType("purchase");
      setMessage(isAuthorization ? (data.created === false ? "La autorización ya estaba registrada; se reutilizaron el paciente y el programa." : "Autorización registrada con su paciente y programa de seguimiento.") : "Factura recibida y conciliada contra el catálogo.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible registrar el documento"); }
    finally { setBusy(false); }
  }

  async function decide(invoiceId: string, lineId: string, action: string) {
    const productCode = action === "link" ? window.prompt("Código exacto del producto en el catálogo") ?? "" : "";
    const reason = action === "reject" ? window.prompt("Motivo del rechazo") ?? "" : "";
    const response = await fetch(`/api/documents/invoices/${invoiceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, lineId, productCode, reason }) });
    const data = await response.json() as { error?: string }; setMessage(response.ok ? "Decisión registrada." : data.error || "No fue posible registrar la decisión"); if (response.ok) router.refresh();
  }

  async function post(invoiceId: string) {
    if (!window.confirm("¿Contabilizar esta factura de compra? Esta acción actualizará las existencias.")) return;
    const response = await fetch(`/api/documents/invoices/${invoiceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "post" }) });
    const data = await response.json() as { error?: string }; setMessage(response.ok ? "Factura contabilizada en inventario." : data.error || "No fue posible contabilizar"); if (response.ok) router.refresh();
  }

  async function saveReviewer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    const response = await fetch("/api/documents/reviewers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: values.get("profileId"), whatsappNumber: values.get("whatsappNumber"), canReview: values.get("canReview") === "on", canCreateProducts: values.get("canCreateProducts") === "on", canPost: values.get("canPost") === "on" }) });
    const data = await response.json() as { error?: string }; setMessage(response.ok ? "Usuario y WhatsApp autorizados." : data.error || "No fue posible guardar"); if (response.ok) router.refresh();
  }

  return <div className="invoice-workspace">
    <header className="page-heading"><div><p className="section-kicker">DOCUMENTOS</p><h1>Gestión de documentos</h1><p>Cargue fotografías, escaneos o PDF desde el teléfono. El sistema conserva el original, extrae datos para revisión y registra solo la información confirmada.</p></div></header>
    {message && <div className="staff-feedback" role="status">{message}</div>}
    <section className="module-panel invoice-upload-panel"><div className="module-panel-heading"><div><h2><FileImage size={19}/> Recibir documento</h2><p>Use únicamente datos visibles. Los campos dudosos deben corregirse antes de registrar.</p></div></div>
      <form className="invoice-form" onSubmit={upload}>
        <div className="invoice-form-grid">
          <label><span>Fotografía o PDF</span><input accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" name="file" ref={fileInput} required type="file" /></label>
          <label><span>Tipo de documento</span><select name="documentType" onChange={(event) => setDocumentType(event.target.value)} required value={documentType}><option value="purchase">Factura de compra / entrada</option><option value="dispensation">Factura de dispensación</option><option value="insurance_authorization">Autorización de seguro</option></select></label>
          <label><span>Sucursal</span><select name="branchId" required><option value="">Seleccione…</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} {branch.code}</option>)}</select></label>
          {!isAuthorization && <label><span>Referencia</span><input autoComplete="off" name="reference" /></label>}
        </div>
        <div><button className="button button-secondary" disabled={ocrBusy} onClick={extractText} type="button"><FileImage size={16}/> {ocrBusy ? "Extrayendo texto…" : "Extraer texto de la foto"}</button></div>

        {isAuthorization && <>
          <div className="invoice-form-grid authorization-fields">
            <label><span>ARS</span><select name="insurerCode" onChange={(event) => updateAuthorization("insurerCode", event.target.value)} required value={authorization.insurerCode}><option value="">Seleccione…</option>{insurers.map((insurer) => <option key={insurer.code} value={insurer.code}>{insurer.name}</option>)}</select></label>
            <label><span>Nombre del paciente</span><input name="patientName" onChange={(event) => updateAuthorization("patientName", event.target.value)} required value={authorization.patientName}/></label>
            <label><span>Cédula</span><input inputMode="numeric" maxLength={11} name="governmentId" onChange={(event) => updateAuthorization("governmentId", digitsOnly(event.target.value, 11))} value={authorization.governmentId}/></label>
            <label><span>Carnet</span><input inputMode="numeric" name="insuranceCard" onChange={(event) => updateAuthorization("insuranceCard", event.target.value)} value={authorization.insuranceCard}/></label>
            <label><span>Teléfono</span><input inputMode="numeric" maxLength={12} name="phone" onChange={(event) => updateAuthorization("phone", formatPhoneNumber(event.target.value))} placeholder="809-555-0000" required value={formatPhoneNumber(authorization.phone)}/></label>
            <label><span>Número de autorización</span><input name="authorizationNumber" onChange={(event) => updateAuthorization("authorizationNumber", event.target.value)} required value={authorization.authorizationNumber}/></label>
            <label><span>Fecha de autorización</span><input max={maximumDocumentDate} name="authorizationDate" onChange={(event) => updateAuthorization("authorizationDate", event.target.value)} required type="date" value={authorization.authorizationDate}/></label>
            <label><span>Prescriptor</span><input name="prescriber" onChange={(event) => updateAuthorization("prescriber", event.target.value)} value={authorization.prescriber}/></label>
          </div>
          <div className="authorization-confirmations" role="group" aria-label="Confirmaciones de autorización">
            <label><input checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} type="checkbox"/> Documento indica AUTORIZADO</label>
            <label><input checked={authorization.continuousUse} onChange={(event) => updateAuthorization("continuousUse", event.target.checked)} type="checkbox"/> Documento indica uso continuo</label>
            <label><input checked={consentGranted} onChange={(event) => setConsentGranted(event.target.checked)} type="checkbox"/> Paciente autorizó el seguimiento</label>
            <label><input checked={callReminder} onChange={(event) => setCallReminder(event.target.checked)} type="checkbox"/> Recordatorio por llamada</label>
            <label><input checked={whatsappReminder} onChange={(event) => setWhatsappReminder(event.target.checked)} type="checkbox"/> Recordatorio por WhatsApp</label>
          </div>
        </>}

        <div className="invoice-lines-heading"><strong>{isAuthorization ? "Medicamentos autorizados" : "Renglones visibles"}</strong><button className="button button-secondary" onClick={() => setLines((current) => [...current, blankLine()])} type="button"><Plus size={15}/> Agregar renglón</button></div>
        {lines.map((line, index) => <div className={`invoice-line-editor ${isAuthorization ? "authorization-line-editor" : ""}`} key={index}>
          <input aria-label={`${isAuthorization ? "Medicamento" : "Descripción"} ${index + 1}`} onChange={(event) => updateLine(index, "description", event.target.value)} placeholder="Producto y presentación" required value={line.description}/>
          {!isAuthorization && <input aria-label={`Código ${index + 1}`} onChange={(event) => updateLine(index, "code", event.target.value)} placeholder="Código" value={line.code}/>}
          <input aria-label={`Cantidad ${index + 1}`} inputMode="decimal" onChange={(event) => updateLine(index, "quantity", event.target.value)} pattern="[0-9]+([.][0-9]+)?" placeholder="Cantidad" required value={line.quantity}/>
          {!isAuthorization && <><input aria-label={`Lote ${index + 1}`} onChange={(event) => updateLine(index, "lot", event.target.value)} placeholder="Lote" value={line.lot}/><input aria-label={`Vencimiento ${index + 1}`} onChange={(event) => updateLine(index, "expiryDate", event.target.value)} type="date" value={line.expiryDate}/></>}
          {lines.length > 1 && <button aria-label={`Eliminar renglón ${index + 1}`} className="icon-button" onClick={() => setLines((current) => current.filter((_, position) => position !== index))} type="button"><Trash2 size={16}/></button>}
        </div>)}
        <button className="button button-primary" disabled={busy} type="submit"><Upload size={16}/> {busy ? "Procesando…" : isAuthorization ? "Registrar paciente y programa" : "Guardar y conciliar"}</button>
      </form>
    </section>

    {isAdmin && <section className="module-panel"><div className="module-panel-heading"><div><h2><ShieldCheck size={19}/> Usuarios autorizados</h2><p>Vincule perfiles internos y números WhatsApp verificados; no se crean credenciales duplicadas.</p></div></div><form className="reviewer-form" onSubmit={saveReviewer}><select aria-label="Usuario" name="profileId" required><option value="">Seleccione usuario…</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.role}</option>)}</select><input aria-label="Número WhatsApp" inputMode="numeric" maxLength={12} name="whatsappNumber" onChange={(event) => { event.currentTarget.value = formatPhoneNumber(event.currentTarget.value); }} placeholder="809-555-0000"/><label><input defaultChecked name="canReview" type="checkbox"/> Revisar</label><label><input name="canCreateProducts" type="checkbox"/> Crear productos</label><label><input name="canPost" type="checkbox"/> Contabilizar</label><button className="button button-primary" type="submit"><Save size={15}/> Autorizar</button></form></section>}

    <section className="module-panel"><div className="module-panel-heading"><div><h2><FileCheck2 size={19}/> Autorizaciones registradas</h2><p>Documento original, paciente y programa de seguimiento vinculados sin generar movimientos de inventario.</p></div></div><div className="invoice-list">{authorizations.length === 0 ? <div className="empty-state">No hay autorizaciones registradas.</div> : authorizations.map((item) => <article className="invoice-card" key={item.id}><header><div><strong>{item.reference}</strong><span>{item.insurer} · {item.patientName} · {new Date(item.createdAt).toLocaleString("es-DO")}</span></div><span className={`status-badge status-${item.status}`}>{item.status}</span></header><div className="invoice-review-line"><div><strong>{item.prescriptionNumber}</strong><span>{item.medicines.length} medicamento(s) vinculados al programa.</span></div></div>{item.medicines.map((medicine) => <div className="invoice-review-line" key={medicine.id}><div><strong>{medicine.description}</strong><span>Cantidad autorizada: {medicine.quantity}</span></div><span className={`status-badge status-${medicine.status}`}>{medicine.status}</span></div>)}</article>)}</div></section>

    <section className="module-panel"><div className="module-panel-heading"><div><h2>Bandeja de conciliación de facturas</h2><p>Coincidencias, productos ausentes y decisiones pendientes.</p></div></div><div className="invoice-list">{invoices.length === 0 ? <div className="empty-state">No hay facturas recibidas.</div> : invoices.map((invoice) => <article className="invoice-card" key={invoice.id}><header><div><strong>{invoice.reference || "Sin referencia"}</strong><span>{invoice.channel} · {invoice.type} · {new Date(invoice.createdAt).toLocaleString("es-DO")}</span></div><span className={`status-badge status-${invoice.status}`}>{invoice.status}</span></header>{invoice.lines.map((line) => <div className="invoice-review-line" key={line.id}><div><strong>{line.description}</strong><span>Código: {line.code || "no visible"} · Cantidad: {line.quantity} · Lote: {line.lot || "pendiente"}</span></div><span className={`status-badge status-${line.status}`}>{line.status}</span>{["product_missing","ambiguous","pending"].includes(line.status) && <div className="invoice-actions"><button className="button button-secondary" onClick={() => decide(invoice.id,line.id,"link")} type="button">Asociar</button><Link className="button button-secondary" href="/inventario?create=1">Crear producto</Link><button className="button button-danger" onClick={() => decide(invoice.id,line.id,"reject")} type="button">No crear</button></div>}</div>)}{invoice.type === "purchase" && invoice.status === "ready" && <button className="button button-primary" onClick={() => post(invoice.id)} type="button">Aprobar y contabilizar</button>}</article>)}</div></section>
  </div>;
}
