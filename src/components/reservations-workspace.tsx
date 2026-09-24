"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, PackageCheck, Plus, Search, X } from "lucide-react";
import type { ReservationSearchResult, ReservationStatus, ReservationSummary } from "@/modules/reservations/reservation-repository";
import { formatPhoneNumber } from "@/shared/contact-format";

interface Option { id: string; name: string; code?: string }
interface Props {
  branches: Option[]; patients: Option[]; products: Option[]; canWrite: boolean; query: string;
  status: ReservationStatus; branchCode: string; summary: ReservationSummary; result: ReservationSearchResult;
}
const labels: Record<string,string>={created:"Creada",confirmed:"Confirmada",collected:"Retirada",delivered:"Entregada",expired:"Vencida",cancelled:"Cancelada"};

export function ReservationsWorkspace(props: Props) {
  const router=useRouter(); const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function create(event: React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);
    try{const response=await fetch("/api/reservations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({patientId:form.get("patientId"),productId:form.get("productId"),branchId:form.get("branchId"),quantity:Number(form.get("quantity")),expiresAt:form.get("expiresAt")})});const body=await response.json();if(!response.ok)throw new Error(body.error||"No se pudo crear la reserva");setOpen(false);router.refresh();}catch(reason){setError(reason instanceof Error?reason.message:"No se pudo crear la reserva");}finally{setBusy(false);}
  }
  async function cancel(id:string){if(!window.confirm("¿Cancelar esta reserva y liberar la existencia?"))return;setBusy(true);setError("");try{const response=await fetch(`/api/reservations/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:"cancelled"})});const body=await response.json();if(!response.ok)throw new Error(body.error||"No se pudo cancelar la reserva");router.refresh();}catch(reason){setError(reason instanceof Error?reason.message:"No se pudo cancelar la reserva");}finally{setBusy(false);}}
  return <div className="page-stack">
    <section className="page-heading"><div><p className="eyebrow">DISPONIBILIDAD COMPROMETIDA</p><h1>Reservas</h1><p className="page-description">Medicamentos apartados con vencimiento y liberación auditable por lote.</p></div>{props.canWrite&&<button className="button button-primary" onClick={()=>setOpen(true)} type="button"><Plus size={17}/> Crear reserva</button>}</section>
    <section className="module-metric-grid" aria-label="Resumen de reservas">
      <article className="module-metric-card"><i className="module-metric-accent module-metric-blue"/><p>Total</p><strong>{props.summary.total}</strong><span>Registros persistidos</span></article>
      <article className="module-metric-card"><i className="module-metric-accent module-metric-emerald"/><p>Activas</p><strong>{props.summary.active}</strong><span>Existencia apartada</span></article>
      <article className="module-metric-card"><i className="module-metric-accent module-metric-amber"/><p>Vencen hoy</p><strong>{props.summary.expiringToday}</strong><span>Requieren atención</span></article>
      <article className="module-metric-card"><i className="module-metric-accent module-metric-rose"/><p>Vencidas activas</p><strong>{props.summary.expired}</strong><span>Pendientes de liberar</span></article>
    </section>
    {error&&<div className="staff-feedback staff-feedback-error" role="alert">{error}</div>}
    <section className="panel module-table-panel"><div className="panel-heading module-panel-heading"><div><p className="section-kicker">OPERACIÓN REAL</p><h2>Reservas registradas</h2></div><PackageCheck size={20}/></div>
      <form action="/reservas" className="table-toolbar" method="get"><label><Search size={16}/><input aria-label="Buscar reservas" defaultValue={props.query} name="q" placeholder="Paciente, producto o referencia…"/></label><select aria-label="Estado" defaultValue={props.status} name="status"><option value="all">Todos los estados</option><option value="confirmed">Confirmadas</option><option value="collected">Retiradas</option><option value="delivered">Entregadas</option><option value="expired">Vencidas</option><option value="cancelled">Canceladas</option></select><select aria-label="Sucursal" defaultValue={props.branchCode} name="branch"><option value="">Todas las sucursales</option>{props.branches.map(b=><option key={b.id} value={b.code}>{b.name} {b.code}</option>)}</select><button type="submit">Filtrar</button></form>
      {props.result.items.length===0?<div className="empty-state">No hay reservas registradas.</div>:<div className="module-table" role="table" aria-label="Reservas registradas"><div className="module-row module-row-header" role="row"><span>Paciente</span><span>Producto</span><span>Vencimiento</span><span>Estado</span></div>{props.result.items.map(item=><div className="module-row" role="row" key={item.id}><span className="module-primary"><i>{item.patientName.charAt(0)}</i>{item.patientName}<small>{formatPhoneNumber(item.phone)}</small></span><span>{item.productName} · {item.quantity}<small>{item.branchName} {item.branchCode}</small></span><span className="muted-cell"><CalendarClock size={14}/> {new Intl.DateTimeFormat("es-DO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.expiresAt))}</span><span><span className={`status status-${item.status==="confirmed"?"emerald":item.status==="cancelled"||item.status==="expired"?"rose":"blue"}`}>{labels[item.status]}</span>{props.canWrite&&item.status==="confirmed"&&<button className="button button-secondary" disabled={busy} onClick={()=>cancel(item.id)} type="button">Cancelar</button>}</span></div>)}</div>}
    </section>
    {open&&<div className="dialog-backdrop" role="presentation"><section aria-labelledby="reservation-title" aria-modal="true" className="product-dialog" role="dialog"><form onSubmit={create}><header><div><p className="eyebrow">NUEVA RESERVA</p><h2 id="reservation-title">Crear reserva</h2></div><button aria-label="Cerrar" className="icon-button" onClick={()=>setOpen(false)} type="button"><X/></button></header><div className="product-core-fields"><label><span>Paciente</span><select name="patientId" required><option value="">Seleccione…</option>{props.patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>Producto</span><select name="productId" required><option value="">Seleccione…</option>{props.products.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label><label><span>Sucursal</span><select name="branchId" required><option value="">Seleccione…</option>{props.branches.map(b=><option key={b.id} value={b.id}>{b.name} {b.code}</option>)}</select></label><label><span>Cantidad</span><input min="0.001" name="quantity" required step="0.001" type="number"/></label><label><span>Vence</span><input name="expiresAt" required type="datetime-local"/></label></div>{error&&<div className="staff-feedback staff-feedback-error" role="alert">{error}</div>}<footer><button className="button button-secondary" onClick={()=>setOpen(false)} type="button">Cerrar</button><button className="button button-primary" disabled={busy} type="submit">{busy?"Guardando…":"Guardar reserva"}</button></footer></form></section></div>}
  </div>;
}
