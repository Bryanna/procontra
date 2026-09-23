import { describe, expect, it } from "vitest";
import { mustChangePassword, validatePasswordReset } from "./password-reset";

describe("validatePasswordReset", () => {
  it("accepts matching strong passwords", () => {
    expect(validatePasswordReset("NuevaClave!2026", "NuevaClave!2026")).toEqual({ ok: true, password: "NuevaClave!2026" });
  });

  it("rejects short, weak or mismatched passwords", () => {
    expect(validatePasswordReset("corta", "corta")).toEqual({ ok: false });
    expect(validatePasswordReset("sololetraslargas", "sololetraslargas")).toEqual({ ok: false });
    expect(validatePasswordReset("NuevaClave!2026", "OtraClave!2026")).toEqual({ ok: false });
  });

  it("requires a password change only for the explicit temporary-password flag", () => {
    expect(mustChangePassword({ must_change_password: true })).toBe(true);
    expect(mustChangePassword({ must_change_password: false })).toBe(false);
    expect(mustChangePassword({})).toBe(false);
    expect(mustChangePassword(null)).toBe(false);
  });
});
