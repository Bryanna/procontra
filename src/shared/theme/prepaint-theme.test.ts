import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyThemeBeforePaint, themeBootScript } from "./prepaint-theme";

describe("pre-paint theme restoration", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  beforeEach(() => {
    values.clear();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  });

  afterEach(() => {
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
  });

  it("restores a saved dark theme before the application mounts", () => {
    storage.setItem("procontra-theme", "dark");

    applyThemeBeforePaint(document.documentElement, storage, false);

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("uses the operating-system preference when no theme was saved", () => {
    applyThemeBeforePaint(document.documentElement, storage, true);

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ships an inline boot script with the same pre-paint behavior", () => {
    storage.setItem("procontra-theme", "dark");

    Function(themeBootScript)();

    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
