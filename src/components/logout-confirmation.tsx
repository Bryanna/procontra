"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LogOut, ShieldCheck, X } from "lucide-react";

interface LogoutConfirmationProps {
  displayName: string;
  triggerStyle?: "icon" | "button";
}

export function LogoutConfirmation({ displayName, triggerStyle = "icon" }: LogoutConfirmationProps) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return <>
    <button
      aria-label="Cerrar sesión"
      className={triggerStyle === "button" ? "button button-secondary logout-trigger-full" : "logout-button"}
      onClick={() => setOpen(true)}
      type="button"
    >
      <LogOut size={triggerStyle === "button" ? 17 : 16} />
      {triggerStyle === "button" && <span>Cerrar sesión</span>}
    </button>
    {open && <div className="logout-confirmation">
      <button aria-label="Cancelar cierre de sesión" className="logout-confirmation-backdrop" onClick={() => setOpen(false)} type="button" />
      <section aria-label="Confirmar cierre de sesión" aria-modal="true" className="logout-confirmation-card" role="dialog">
        <button aria-label="Cerrar confirmación" className="logout-confirmation-close" onClick={() => setOpen(false)} type="button"><X size={19} /></button>
        <div className="logout-confirmation-logo">
          <Image alt="Farmacia La Línea" height={76} priority src="/brand/logo-mark.png" width={76} />
        </div>
        <p className="logout-confirmation-kicker">PROCONTRA · ACCESO SEGURO</p>
        <h2 id="logout-confirmation-title">¿Desea cerrar la sesión?</h2>
        <p className="logout-confirmation-copy">Está por finalizar la sesión de <strong>{displayName}</strong>. Los cambios guardados permanecerán protegidos en el servidor.</p>
        <div className="logout-confirmation-note"><ShieldCheck size={18} /><span>Podrá ingresar nuevamente con sus credenciales autorizadas.</span></div>
        <div className="logout-confirmation-actions">
          <button className="logout-cancel" onClick={() => setOpen(false)} ref={cancelRef} type="button">Cancelar</button>
          <form action="/api/auth/logout" method="post"><button className="logout-confirm" type="submit"><LogOut size={17} />Sí, cerrar sesión</button></form>
        </div>
      </section>
    </div>}
  </>;
}
