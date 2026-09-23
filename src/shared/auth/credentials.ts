type LoginInput = {
  email: unknown;
  password: unknown;
};

export type ValidatedCredentials =
  | { ok: true; email: string; password: string }
  | { ok: false; error: "Credenciales inválidas" };

export function validateLoginCredentials(input: LoginInput): ValidatedCredentials {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!validEmail || password.length < 8 || password.length > 256) {
    return { ok: false, error: "Credenciales inválidas" };
  }
  return { ok: true, email, password };
}
