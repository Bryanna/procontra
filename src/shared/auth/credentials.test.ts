import { validateLoginCredentials } from "./credentials";

describe("login credential validation", () => {
  it("normalizes a valid email without modifying the password", () => {
    expect(validateLoginCredentials({
      email: "  ADMIN@FarmaciaLaLinea.Local ",
      password: "A-secure password 123",
    })).toEqual({
      ok: true,
      email: "admin@farmacialalinea.local",
      password: "A-secure password 123",
    });
  });

  it("returns a generic error for malformed credentials", () => {
    expect(validateLoginCredentials({ email: "not-email", password: "short" })).toEqual({
      ok: false,
      error: "Credenciales inválidas",
    });
  });
});
