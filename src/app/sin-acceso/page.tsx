import Image from "next/image";
import { ShieldX } from "lucide-react";
import { LogoutConfirmation } from "@/components/logout-confirmation";

export default function AccessDeniedPage() {
  return (
    <main className="login-page">
      <section className="login-card access-denied-card">
        <span className="login-logo">
          <Image alt="Farmacia La Línea" height={72} priority src="/brand/logo-mark.png" width={72} />
        </span>
        <ShieldX size={34} />
        <p className="eyebrow">ACCESO CONTROLADO</p>
        <h1>Sin permiso para este módulo</h1>
        <p>Su sesión es válida, pero su rol o asignación no permite acceder a esta función.</p>
        <p>Solicite revisión al administrador de PROCONTRA si necesita acceso operativo.</p>
        <LogoutConfirmation displayName="Usuario de PROCONTRA" triggerStyle="button" />
      </section>
    </main>
  );
}
