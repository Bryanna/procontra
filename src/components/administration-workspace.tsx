"use client";

import { useState, type FormEvent } from "react";
import { Clock3, KeyRound, Pencil, ShieldCheck, UserPlus, UsersRound } from "lucide-react";

import type { StaffAuditEvent } from "@/modules/administration/staff-administration-service";
import type { StaffAccount, StaffBranch } from "@/modules/administration/staff-management";
import type { StaffRole } from "@/shared/auth/permissions";

export interface AdministrationData {
  accounts: StaffAccount[];
  branches: StaffBranch[];
  auditEvents: StaffAuditEvent[];
}

const roleLabels: Record<StaffRole, string> = {
  administrator: "Administrador",
  coordinator: "Coordinación PROCONTRA",
  pharmacist: "Farmacéutico",
  inventory: "Inventario",
  attention: "Atención",
  physician: "Médico",
  direction: "Dirección",
};

const eventLabels: Record<string, string> = {
  "staff.created": "Empleado creado",
  "staff.updated": "Acceso actualizado",
  "staff.access_reset": "Acceso restablecido",
};

function dateLabel(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function responseJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "No fue posible completar la operación");
  return body;
}

function BranchChecks({ branches, selected = [] }: { branches: StaffBranch[]; selected?: string[] }) {
  return (
    <fieldset className="staff-branches">
      <legend>Sucursales asignadas</legend>
      <div>
        {branches.map((branch) => (
          <label key={branch.id}>
            <input defaultChecked={selected.includes(branch.id)} name="branchIds" type="checkbox" value={branch.id} />
            <span>{branch.name} {branch.code}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function AdministrationWorkspace({
  initialData,
  currentUserId,
}: {
  initialData: AdministrationData;
  currentUserId: string;
}) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recoveryLink, setRecoveryLink] = useState("");

  async function refresh() {
    const response = await fetch("/api/administration/staff", { cache: "no-store" });
    setData(await responseJson(response));
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await responseJson(await fetch("/api/administration/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: form.get("displayName"),
          email: form.get("email"),
          role: form.get("role"),
          branchIds: form.getAll("branchIds"),
        }),
      }));
      event.currentTarget.reset();
      await refresh();
      setMessage("Empleado creado. Use “Restablecer acceso” para generar su enlace inicial seguro.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible crear el empleado");
    } finally { setBusy(false); }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setError(""); setMessage(""); setRecoveryLink("");
    const form = new FormData(event.currentTarget);
    try {
      await responseJson(await fetch(`/api/administration/staff/${editing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: form.get("displayName"),
          role: form.get("role"),
          active: form.get("active") === "on",
          branchIds: form.getAll("branchIds"),
        }),
      }));
      await refresh();
      setEditing(null);
      setMessage("Acceso del empleado actualizado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible actualizar el empleado");
    } finally { setBusy(false); }
  }

  async function resetAccess() {
    if (!editing) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await responseJson(await fetch(`/api/administration/staff/${editing.id}/reset`, { method: "POST" }));
      setRecoveryLink(result.recoveryLink);
      setMessage("Enlace generado. Compártalo por un canal privado; se muestra solo para esta operación.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible restablecer el acceso");
    } finally { setBusy(false); }
  }

  return (
    <div className="page-stack admin-page staff-admin-page">
      <section className="page-heading">
        <div><p className="eyebrow">GOBERNANZA Y SEGURIDAD</p><h1>Administración de empleados</h1><p className="page-description">Cuentas individuales, roles, sucursales y trazabilidad de acceso.</p></div>
        <span className="status status-green"><ShieldCheck size={16} /> {data.accounts.filter((account) => account.active).length} cuentas activas</span>
      </section>

      {(message || error) && <div className={error ? "staff-feedback staff-feedback-error" : "staff-feedback"} role={error ? "alert" : "status"}>{error || message}</div>}

      <div className="admin-two-column staff-admin-grid">
        <section className="panel">
          <div className="panel-heading"><div><p className="section-kicker">ALTA CONTROLADA</p><h2>Crear empleado</h2></div><UserPlus size={18} /></div>
          <form className="staff-form" onSubmit={submitCreate}>
            <label><span>Nombre completo</span><input name="displayName" required minLength={2} /></label>
            <label><span>Correo electrónico</span><input name="email" required type="email" /></label>
            <label><span>Rol</span><select defaultValue="attention" name="role">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <BranchChecks branches={data.branches} />
            <button className="button button-primary" disabled={busy} type="submit"><UserPlus size={16} /> Crear empleado</button>
          </form>
        </section>

        <section className="panel staff-list-panel">
          <div className="panel-heading"><div><p className="section-kicker">PERSONAL AUTORIZADO</p><h2>Empleados</h2></div><UsersRound size={18} /></div>
          <div className="staff-account-list">
            {data.accounts.map((account) => (
              <article className={!account.active ? "staff-account staff-account-inactive" : "staff-account"} key={account.id}>
                <div className="staff-avatar">{account.displayName.slice(0, 1).toUpperCase()}</div>
                <div className="staff-account-body">
                  <div><strong>{account.displayName}</strong><span className={account.active ? "status status-green" : "status status-gray"}>{account.active ? "Activa" : "Inactiva"}</span></div>
                  <p>{account.email}</p>
                  <small>{roleLabels[account.role]} · {account.branches.length ? account.branches.map((branch) => `${branch.name} ${branch.code}`).join(", ") : "Alcance institucional"}</small>
                  <small><Clock3 size={13} /> Último ingreso: {dateLabel(account.lastSignInAt)}</small>
                </div>
                <button aria-label={`Editar ${account.displayName}`} className="icon-button" onClick={() => { setEditing(account); setRecoveryLink(""); setError(""); setMessage(""); }} type="button"><Pencil size={16} /></button>
              </article>
            ))}
          </div>
        </section>
      </div>

      {editing && (
        <section className="panel staff-editor">
          <div className="panel-heading"><div><p className="section-kicker">CONTROL DE ACCESO</p><h2>Editar empleado</h2></div><KeyRound size={18} /></div>
          <form className="staff-form" key={editing.id} onSubmit={submitEdit}>
            <label><span>Nombre del empleado</span><input defaultValue={editing.displayName} name="displayName" required /></label>
            <label><span>Rol del empleado</span><select defaultValue={editing.role} name="role">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="staff-active-toggle"><input defaultChecked={editing.active} disabled={editing.id === currentUserId} name="active" type="checkbox" /><span>Cuenta activa</span></label>
            {editing.id === currentUserId && <p className="staff-self-note">No puede desactivar su propia cuenta.</p>}
            <BranchChecks branches={data.branches} selected={editing.branchIds} />
            <div className="staff-editor-actions">
              <button className="button button-primary" disabled={busy} type="submit">Guardar cambios</button>
              <button className="button" disabled={busy || !editing.active} onClick={resetAccess} type="button">Restablecer acceso</button>
              <button className="button" onClick={() => setEditing(null)} type="button">Cancelar</button>
            </div>
          </form>
          {recoveryLink && <label className="recovery-link"><span>Enlace privado de recuperación</span><textarea readOnly value={recoveryLink} /></label>}
        </section>
      )}

      <section className="panel">
        <div className="panel-heading"><div><p className="section-kicker">TRAZABILIDAD FUNCIONAL</p><h2>Auditoría reciente</h2></div><Clock3 size={18} /></div>
        <div className="staff-audit-list">
          {data.auditEvents.length === 0 && <p>No hay cambios administrativos registrados.</p>}
          {data.auditEvents.map((event) => <article key={event.id}><span className="audit-dot" /><div><strong>{eventLabels[event.eventType] ?? event.eventType}</strong><p>Por {event.actorName}</p></div><time dateTime={event.createdAt}>{dateLabel(event.createdAt)}</time></article>)}
        </div>
      </section>
    </div>
  );
}
