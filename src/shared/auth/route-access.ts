import { can, type Permission, type StaffRole } from "./permissions";

const publicPrefixes = [
  "/_next/",
  "/brand/",
  "/downloads/",
];

const publicExact = new Set([
  "/ingresar",
  "/restablecer",
  "/api/auth/login",
  "/api/auth/callback",
  "/api/auth/reset-password",
  "/api/health/server",
  "/api/documents/invoices/channel",
  "/manifest.webmanifest",
  "/favicon.ico",
]);

export function isPublicPath(pathname: string): boolean {
  return publicExact.has(pathname) || publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

const modulePermissions: Array<[string, Permission]> = [
  ["/pacientes", "patients:read"],
  ["/documentos", "documents:read"],
  ["/dispensaciones", "dispensations:read"],
  ["/inventario", "inventory:read"],
  ["/continuidad", "continuity:read"],
  ["/reservas", "reservations:read"],
  ["/mensajeria", "messaging:read"],
  ["/reportes", "reports:read"],
  ["/programa", "continuity:read"],
  ["/administracion", "administration:manage"],
];

export function canAccessPath(role: StaffRole, pathname: string): boolean {
  const required = modulePermissions.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  return required ? can(role, required) : true;
}
