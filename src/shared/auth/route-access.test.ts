import { canAccessPath, isPublicPath } from "./route-access";

describe("route access", () => {
  it("keeps only login, health and static assets public", () => {
    expect(isPublicPath("/ingresar")).toBe(true);
    expect(isPublicPath("/api/auth/login")).toBe(true);
    expect(isPublicPath("/api/health/server")).toBe(true);
    expect(isPublicPath("/api/health/supabase")).toBe(false);
    expect(isPublicPath("/brand/logo-mark.png")).toBe(true);
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
    expect(isPublicPath("/inventario")).toBe(false);
    expect(isPublicPath("/pacientes")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
  });

  it("enforces module permissions after authentication", () => {
    expect(canAccessPath("inventory", "/inventario")).toBe(true);
    expect(canAccessPath("inventory", "/pacientes")).toBe(false);
    expect(canAccessPath("direction", "/reportes")).toBe(true);
    expect(canAccessPath("direction", "/administracion")).toBe(false);
    expect(canAccessPath("administrator", "/administracion")).toBe(true);
    expect(canAccessPath("attention", "/sin-acceso")).toBe(true);
    expect(canAccessPath("physician", "/programa")).toBe(true);
    expect(canAccessPath("attention", "/programa")).toBe(true);
    expect(canAccessPath("inventory", "/programa")).toBe(false);
  });
});
