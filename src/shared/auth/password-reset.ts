export function validatePasswordReset(password: unknown, confirmation: unknown):
  | { ok: true; password: string }
  | { ok: false } {
  if (typeof password !== "string" || typeof confirmation !== "string") return { ok: false };
  if (password !== confirmation || password.length < 12 || password.length > 128) return { ok: false };
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return { ok: false };
  return { ok: true, password };
}

export function mustChangePassword(metadata: unknown): boolean {
  return typeof metadata === "object"
    && metadata !== null
    && "must_change_password" in metadata
    && (metadata as { must_change_password?: unknown }).must_change_password === true;
}
