"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { FileImage, Plus, Save, ShieldCheck, Trash2, Upload } from "lucide-react";

type Branch = { id: string; code: string; name: string };
type Line = { id: string; number: number; description: string; code: string | null; quantity: number; lot: string | null; expiry: string | null; status: string; productName: string | null };
type Invoice = { id: string; reference: string | null; type: string; channel: string; status: string; createdAt: string; lines: Line[] };
type Profile = { id: string; name: string; role: string };
const blankLine = () => ({ description: "", code: "", barcode: "", quantity: "", unit: "", unitCost: "", lot: "", expiryDate: "" });

export function InvoiceWorkspace({ branches, invoices, profiles, isAdmin }: { branches: Branch[]; invoices: Invoice[]; profiles: Profile[]; isAdmin: boolean }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState([blankLine()]);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [message, setMessage] = useState("");
  const updateLine = (index: number, key: string, value: string) => setLines((current) => current.map((line, position) => position === index ? { ...line, [key]: value } : line));

  async function extractText() {
    const file = fileInput.current?.files?.[0];
    if (!file) { setMessage("Seleccione primero una fotografía."); return; }
    setOcrBusy(true); setMessage(""); const payload = new FormData(); payload.set("file", file);
    try {
      const response = await fetch("/api/documents/invoices/extract", { method: "POST", body: payload });
      const data = await response.json() as { error?: string; lines?: ReturnType<typeof blankLine>[] };
      if (!response.ok) throw new Error(data.error || "No fue posible extraer el texto");
      if (!data.lines?.length) throw new Error("No se detectaron renglones; complételos manualmente.");
      setLines(data.lines); setMessage("Texto extraído. Revise descripción, código, cantidad, lote y vencimiento antes de guardar.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible extraer el texto"); }
    finally { setOcrBusy(false); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = event.currentTarget; const values = new FormData(form); const payload = new FormData();
    payload.set("file", values.get("file") as File);
    payload.set("metadata", JSON.stringify({ source: "web", documentType: values.get("documentType"), branchId: values.get("branchId"), reference: values.get("reference"), lines: lines.map((line) => ({ ...line, quantity: Number(line.quantity), unitCost: line.unitCost ? Number(line.unitCost) : null })) }));
    try {
      const response = await fetch("/api/documents/invoices", { method: "POST", body: payload });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "No fue posible cargar la factura");
      setLines([blankLine()]); form.reset(); setMessage("Factura recibida y conciliada contra el catálogo."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible cargar la factura"); } finally { setBusy(false); }
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
    <header className="page-heading"><div><p className="section-kicker">DOCUMENTOS E INVENTARIO</p><h1>Fotografías de facturas</h1><p>La fotografía se guarda de forma privada; cada renglón se compara con el catálogo del servidor y los productos ausentes requieren decisión humana.</p></div></header>
    {message && <div className="staff-feedback" role="status">{message}</div>}
    <section className="module-panel invoice-upload-panel"><div className="module-panel-heading"><div><h2><FileImage size={19}/> Recibir fotografía</h2><p>Use datos visibles. No infiera campos ilegibles.</p></div></div>
      <form className="invoice-form" onSubmit={upload}>
        <div className="invoice-form-grid"><label><span>Fotografía o PDF</span><input accept="image/jpeg,image/png,image/webp,application/pdf" name="file" ref={fileInput} required type="file" /></label><label><span>Tipo</span><select name="documentType" required><option value="purchase">Factura de compra / entrada</option><option value="dispensation">Factura de dispensación</option></select></label><label><span>Sucursal</span><select name="branchId" required><option value="">Seleccione…</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} {branch.code}</option>)}</select></label><label><span>Referencia</span><input autoComplete="off" name="reference" /></label></div>
        <div><button className="button button-secondary" disabled={ocrBusy} onClick={extractText} type="button"><FileImage size={16}/> {ocrBusy ? "Extrayendo texto…" : "Extraer texto de la foto"}</button></div>
        <div className="invoice-lines-heading"><strong>Renglones visibles</strong><button className="button button-secondary" onClick={() => setLines((current) => [...current, blankLine()])} type="button"><Plus size={15}/> Agregar renglón</button></div>
        {lines.map((line, index) => <div className="invoice-line-editor" key={index}><input aria-label={`Descripción ${index + 1}`} onChange={(e) => updateLine(index, "description", e.target.value)} placeholder="Producto y presentación" required value={line.description}/><input aria-label={`Código ${index + 1}`} onChange={(e) => updateLine(index, "code", e.target.value)} placeholder="Código" value={line.code}/><input aria-label={`Cantidad ${index + 1}`} min="0.001" onChange={(e) => updateLine(index, "quantity", e.target.value)} step="0.001" type="number" value={line.quantity}/><input aria-label={`Lote ${index + 1}`} onChange={(e) => updateLine(index, "lot", e.target.value)} placeholder="Lote" value={line.lot}/><input aria-label={`Vencimiento ${index + 1}`} onChange={(e) => updateLine(index, "expiryDate", e.target.value)} type="date" value={line.expiryDate}/>{lines.length > 1 && <button aria-label={`Eliminar renglón ${index + 1}`} className="icon-button" onClick={() => setLines((current) => current.filter((_, position) => position !== index))} type="button"><Trash2 size={16}/></button>}</div>)}
        <button className="button button-primary" disabled={busy} type="submit"><Upload size={16}/> {busy ? "Procesando…" : "Guardar y conciliar"}</button>
      </form>
    </section>
    {isAdmin && <section className="module-panel"><div className="module-panel-heading"><div><h2><ShieldCheck size={19}/> Usuarios autorizados</h2><p>Vincule perfiles internos y números WhatsApp verificados; no se crean credenciales duplicadas.</p></div></div><form className="reviewer-form" onSubmit={saveReviewer}><select aria-label="Usuario" name="profileId" required><option value="">Seleccione usuario…</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.role}</option>)}</select><input aria-label="Número WhatsApp" name="whatsappNumber" placeholder="18095551234"/><label><input defaultChecked name="canReview" type="checkbox"/> Revisar</label><label><input name="canCreateProducts" type="checkbox"/> Crear productos</label><label><input name="canPost" type="checkbox"/> Contabilizar</label><button className="button button-primary" type="submit"><Save size={15}/> Autorizar</button></form></section>}
    <section className="module-panel"><div className="module-panel-heading"><div><h2>Bandeja de conciliación</h2><p>Coincidencias, productos ausentes y decisiones pendientes.</p></div></div><div className="invoice-list">{invoices.length === 0 ? <div className="empty-state">No hay facturas recibidas.</div> : invoices.map((invoice) => <article className="invoice-card" key={invoice.id}><header><div><strong>{invoice.reference || "Sin referencia"}</strong><span>{invoice.channel} · {invoice.type} · {new Date(invoice.createdAt).toLocaleString("es-DO")}</span></div><span className={`status-badge status-${invoice.status}`}>{invoice.status}</span></header>{invoice.lines.map((line) => <div className="invoice-review-line" key={line.id}><div><strong>{line.description}</strong><span>Código: {line.code || "no visible"} · Cantidad: {line.quantity} · Lote: {line.lot || "pendiente"}</span></div><span className={`status-badge status-${line.status}`}>{line.status}</span>{["product_missing","ambiguous","pending"].includes(line.status) && <div className="invoice-actions"><button className="button button-secondary" onClick={() => decide(invoice.id,line.id,"link")} type="button">Asociar</button><Link className="button button-secondary" href="/inventario?create=1">Crear producto</Link><button className="button button-danger" onClick={() => decide(invoice.id,line.id,"reject")} type="button">No crear</button></div>}</div>)}{invoice.type === "purchase" && invoice.status === "ready" && <button className="button button-primary" onClick={() => post(invoice.id)} type="button">Aprobar y contabilizar</button>}</article>)}</div></section>
  </div>;
}
