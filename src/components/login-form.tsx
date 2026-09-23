"use client";

import Image from "next/image";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const rememberedEmailKey = "procontra:remembered-email";

export function LoginForm({ error }: { error?: string }) {
  const [email, setEmail] = useState("");
  const [rememberCredentials, setRememberCredentials] = useState(false);

  useEffect(() => {
    const restoreRememberedEmail = window.setTimeout(() => {
      const rememberedEmail = window.localStorage.getItem(rememberedEmailKey);
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberCredentials(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreRememberedEmail);
  }, []);

  function rememberEmail() {
    if (rememberCredentials) {
      window.localStorage.setItem(rememberedEmailKey, email.trim());
    } else {
      window.localStorage.removeItem(rememberedEmailKey);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-logo">
            <Image alt="Farmacia La Línea" height={72} priority src="/brand/logo-mark.png" width={72} />
          </span>
          <div>
            <p className="eyebrow">FARMACIA LA LÍNEA</p>
            <h1 id="login-title">Ingresar a PROCONTRA</h1>
            <p>Acceso exclusivo para personal autorizado.</p>
          </div>
        </div>

        {error && (
          <div className="login-error" role="alert">
            No fue posible iniciar sesión. Verifique sus credenciales.
          </div>
        )}

        <form action="/api/auth/login" className="login-form" method="post" onSubmit={rememberEmail}>
          <label>
            <span>Correo electrónico</span>
            <input autoComplete="email" name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label>
            <span>Contraseña</span>
            <input autoComplete="current-password" minLength={8} name="password" required type="password" />
          </label>
          <label className="remember-credentials">
            <input
              checked={rememberCredentials}
              name="rememberCredentials"
              onChange={(event) => setRememberCredentials(event.target.checked)}
              type="checkbox"
            />
            <span>
              Recordar credenciales
              <small>El correo se guarda en este dispositivo; la contraseña permanece en el gestor seguro del navegador.</small>
            </span>
          </label>
          <button className="button button-primary login-submit" type="submit">
            <LockKeyhole size={18} /> Ingresar a PROCONTRA
          </button>
        </form>

        <div className="login-security-note">
          <ShieldCheck size={18} />
          <span>Sesión protegida y acceso auditado. No comparta sus credenciales.</span>
        </div>
      </section>
    </main>
  );
}
