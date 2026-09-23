"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Save, X } from "lucide-react";

const maintenanceTypes = [
  ["category", "Categorías"],
  ["manufacturer", "Fabricantes o laboratorios"],
  ["activeIngredient", "Principios activos"],
  ["unit", "Unidades de medida"],
  ["dosageForm", "Formas farmacéuticas"],
  ["route", "Vías de administración"],
] as const;

export function InventoryMaintenanceDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/inventory/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: form.get("type"), code: form.get("code"), name: form.get("name"), description: form.get("description") }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible guardar el registro");
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar el registro");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button className="button button-secondary" onClick={() => setOpen(true)} type="button"><Settings2 size={17} /> Gestionar catálogos</button>
    {open && <div className="product-dialog-backdrop" role="presentation">
      <section aria-labelledby="maintenance-dialog-title" aria-modal="true" className="product-dialog maintenance-dialog" role="dialog">
        <header><div className="product-dialog-title"><span><Settings2 size={20} /></span><div><p className="section-kicker">MANTENIMIENTOS DEL SERVIDOR</p><h2 id="maintenance-dialog-title">Nuevo registro de catálogo</h2></div></div><button aria-label="Cerrar" className="icon-button" onClick={() => setOpen(false)} type="button"><X size={18} /></button></header>
        <form onSubmit={submit}>
          <div className="product-form-section"><div className="product-section-heading"><strong>Clasificación del inventario</strong><span>El registro quedará disponible inmediatamente en el formulario de productos.</span></div>
            <div className="product-core-fields maintenance-fields">
              <label><span>Tipo de catálogo</span><select aria-label="Tipo de catálogo" name="type" required>{maintenanceTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Código</span><input autoComplete="off" maxLength={60} name="code" placeholder="Opcional; se genera del nombre" /></label>
              <label className="product-field-wide"><span>Nombre</span><input autoComplete="off" maxLength={200} name="name" required /></label>
              <label className="product-field-wide"><span>Descripción</span><textarea maxLength={500} name="description" rows={3} /></label>
            </div>
          </div>
          {error && <div className="staff-feedback staff-feedback-error" role="alert">{error}</div>}
          <footer><button className="button button-secondary" disabled={busy} onClick={() => setOpen(false)} type="button">Cancelar</button><button className="button button-primary" disabled={busy} type="submit"><Save size={16} /> {busy ? "Guardando…" : "Guardar registro"}</button></footer>
        </form>
      </section>
    </div>}
  </>;
}
