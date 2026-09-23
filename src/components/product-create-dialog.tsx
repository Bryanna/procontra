"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, Plus, Warehouse, X } from "lucide-react";
import type { InventoryBranch, InventoryMaintenanceCatalogs, InventoryMaintenanceOption } from "@/modules/inventory/inventory-catalog";

function CatalogSelect({ label, name, options }: { label: string; name: string; options: InventoryMaintenanceOption[] }) {
  return <label><span>{label}</span><select aria-label={label} name={name} required>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
}

export function ProductCreateDialog({ branches, maintenance }: { branches: InventoryBranch[]; maintenance: InventoryMaintenanceCatalogs }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stockBranches, setStockBranches] = useState<string[]>([]);

  function toggleBranch(branchId: string, checked: boolean) {
    setStockBranches((current) => checked
      ? [...new Set([...current, branchId])]
      : current.filter((id) => id !== branchId));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const positions = branches.flatMap((branch) => {
      if (!stockBranches.includes(branch.id)) return [];
      return [{
        branchId: branch.id,
        onHand: form.get(`onHand-${branch.id}`),
        reorderMinimum: form.get(`minimum-${branch.id}`),
        lot: form.get(`lot-${branch.id}`),
        expiryDate: form.get(`expiry-${branch.id}`),
        cost: form.get(`cost-${branch.id}`),
        price: form.get(`price-${branch.id}`),
      }];
    });
    try {
      let response: Response;
      try {
        response = await fetch("/api/inventory/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: form.get("code"),
            name: form.get("name"),
            presentation: form.get("presentation"),
            barcode: form.get("barcode"),
            activeIngredientId: form.get("activeIngredientId"),
            manufacturerId: form.get("manufacturerId"),
            categoryId: form.get("categoryId"),
            unitOfMeasureId: form.get("unitOfMeasureId"),
            dosageFormId: form.get("dosageFormId"),
            administrationRouteId: form.get("administrationRouteId"),
            sanitaryRegistration: form.get("sanitaryRegistration"),
            prescriptionRequired: form.get("prescriptionRequired") === "on",
            positions,
          }),
        });
      } catch {
        throw new Error("No fue posible conectar con el servidor. Intente nuevamente.");
      }
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible crear el producto");
      setOpen(false);
      setStockBranches([]);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible crear el producto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="button button-primary" onClick={() => setOpen(true)} type="button">
        <Plus size={17} /> Agregar nuevo producto
      </button>
      {open && (
        <div className="product-dialog-backdrop" role="presentation">
          <section aria-labelledby="product-dialog-title" aria-modal="true" className="product-dialog" role="dialog">
            <header>
              <div className="product-dialog-title">
                <span><PackagePlus size={20} /></span>
                <div><p className="section-kicker">CATÁLOGO E INVENTARIO</p><h2 id="product-dialog-title">Agregar nuevo producto</h2></div>
              </div>
              <button aria-label="Cerrar" className="icon-button" onClick={() => setOpen(false)} type="button"><X size={18} /></button>
            </header>
            <form onSubmit={submit}>
              <div className="product-form-section">
                <div className="product-section-heading"><strong>Identificación del producto</strong><span>Código y nombre son obligatorios; los demás campos mejoran la búsqueda y trazabilidad.</span></div>
                <div className="product-core-fields">
                  <label><span>Código</span><input autoFocus autoComplete="off" maxLength={60} name="code" required /></label>
                  <label className="product-field-wide"><span>Nombre del producto</span><input autoComplete="off" maxLength={240} name="name" required /></label>
                  <label><span>Código de barras</span><input autoComplete="off" inputMode="numeric" maxLength={14} name="barcode" pattern="[0-9]{8,14}" placeholder="8 a 14 dígitos" /></label>
                  <label><span>Presentación</span><input autoComplete="off" maxLength={160} name="presentation" placeholder="Ej. Caja de 30 tabletas" /></label>
                  <CatalogSelect label="Principio activo" name="activeIngredientId" options={maintenance.activeIngredients} />
                  <CatalogSelect label="Fabricante o laboratorio" name="manufacturerId" options={maintenance.manufacturers} />
                  <CatalogSelect label="Categoría" name="categoryId" options={maintenance.categories} />
                  <CatalogSelect label="Unidad de medida" name="unitOfMeasureId" options={maintenance.units} />
                  <CatalogSelect label="Forma farmacéutica" name="dosageFormId" options={maintenance.dosageForms} />
                  <CatalogSelect label="Vía de administración" name="administrationRouteId" options={maintenance.routes} />
                  <label><span>Registro sanitario</span><input autoComplete="off" maxLength={100} name="sanitaryRegistration" /></label>
                </div>
                <label className="product-prescription-toggle"><input aria-label="Requiere receta" name="prescriptionRequired" type="checkbox" /><span><strong>Requiere receta</strong><small>Marque cuando la dispensación deba validar una receta.</small></span></label>
              </div>

              <div className="product-stock-heading">
                <Warehouse size={18} />
                <div><strong>Existencia inicial por sucursal</strong><span>Opcional. Active únicamente las sucursales con inventario verificado.</span></div>
              </div>
              <div className="product-branch-grid">
                {branches.map((branch) => {
                  const selected = stockBranches.includes(branch.id);
                  return (
                    <fieldset className={selected ? "product-branch-card product-branch-selected" : "product-branch-card"} key={branch.id}>
                      <label className="product-branch-toggle">
                        <input aria-label={`Registrar existencia en ${branch.name} ${branch.code}`} checked={selected} onChange={(event) => toggleBranch(branch.id, event.target.checked)} type="checkbox" />
                        <span><strong>{branch.name} {branch.code}</strong><small>{selected ? "Inventario inicial habilitado" : "Sin existencia informada"}</small></span>
                      </label>
                      {selected && (
                        <div className="product-stock-fields">
                          <label><span>Existencia</span><input min="0" name={`onHand-${branch.id}`} required step="0.001" type="number" /></label>
                          <label><span>Mínimo</span><input min="0" name={`minimum-${branch.id}`} required step="0.001" type="number" /></label>
                          <label><span>Lote</span><input maxLength={100} name={`lot-${branch.id}`} required /></label>
                          <label><span>Vencimiento</span><input min={new Date().toISOString().slice(0, 10)} name={`expiry-${branch.id}`} required type="date" /></label>
                          <label><span>Costo</span><input min="0" name={`cost-${branch.id}`} step="0.01" type="number" /></label>
                          <label><span>Precio</span><input min="0" name={`price-${branch.id}`} step="0.01" type="number" /></label>
                        </div>
                      )}
                    </fieldset>
                  );
                })}
              </div>
              {error && <div className="staff-feedback staff-feedback-error" role="alert">{error}</div>}
              <footer>
                <button className="button button-secondary" disabled={busy} onClick={() => setOpen(false)} type="button">Cancelar</button>
                <button className="button button-primary" disabled={busy} type="submit"><PackagePlus size={16} /> {busy ? "Guardando…" : "Guardar producto"}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
