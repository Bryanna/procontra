import { KeyRound, ShieldCheck } from "lucide-react";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="reset-title">
        <div className="login-brand"><span className="login-logo"><KeyRound size={34} /></span><div><p className="eyebrow">ACCESO PROCONTRA</p><h1 id="reset-title">Crear nueva contraseña</h1><p>Use una clave privada de al menos 12 caracteres.</p></div></div>
        {error && <div className="login-error" role="alert">Las contraseñas deben coincidir e incluir letras, números y símbolos.</div>}
        <form action="/api/auth/reset-password" className="login-form" method="post">
          <label><span>Nueva contraseña</span><input autoComplete="new-password" minLength={12} name="password" required type="password" /></label>
          <label><span>Confirmar contraseña</span><input autoComplete="new-password" minLength={12} name="confirmation" required type="password" /></label>
          <button className="button button-primary login-submit" type="submit"><ShieldCheck size={18} /> Guardar contraseña</button>
        </form>
      </section>
    </main>
  );
}
