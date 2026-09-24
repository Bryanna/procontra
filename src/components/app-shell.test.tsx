import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("AppShell", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => storage.clear(),
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    delete document.documentElement.dataset.theme;
  });

  it("provides every operational module in the main navigation", () => {
    render(<AppShell><p>Contenido</p></AppShell>);

    const options = [
      "Panel operativo",
      "Pacientes",
      "Documentos",
      "Inventario",
      "Mensajería",
      "Programa",
      "Reportes",
      "Administración",
    ];

    options.forEach((option) => {
      expect(screen.getAllByRole("link", { name: option }).length).toBeGreaterThan(0);
    });
    ["Dispensaciones", "Continuidad", "Reservas"].forEach((option) => {
      expect(screen.queryByRole("link", { name: option })).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Sucursal activa")).not.toBeInTheDocument();
    expect(screen.queryByText("Esperanza 70")).not.toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("opens the navigation drawer on small screens", () => {
    render(<AppShell><p>Contenido</p></AppShell>);

    fireEvent.click(screen.getByRole("button", { name: "Abrir navegación" }));
    const drawer = screen.getByRole("dialog", { name: "Navegación principal" });
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).queryByText("Sucursal activa")).not.toBeInTheDocument();
  });

  it("uses the pharmacy logo and provides an app-style bottom navigation", () => {
    render(<AppShell><p>Contenido</p></AppShell>);

    expect(screen.getAllByRole("img", { name: "Farmacia La Línea" }).length).toBeGreaterThan(0);
    const bottomNavigation = screen.getByRole("navigation", { name: "Navegación inferior" });
    expect(within(bottomNavigation).getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(within(bottomNavigation).getByRole("link", { name: "Pacientes" })).toHaveAttribute("href", "/pacientes");
    expect(within(bottomNavigation).getByRole("link", { name: "Inventario" })).toHaveAttribute("href", "/inventario");
    expect(within(bottomNavigation).queryByRole("link", { name: "Continuidad" })).not.toBeInTheDocument();
    expect(within(bottomNavigation).getByRole("button", { name: "Más opciones" })).toBeInTheDocument();
  });

  it("switches to dark mode and persists the preference", () => {
    render(<AppShell><p>Contenido</p></AppShell>);

    fireEvent.click(screen.getByRole("button", { name: "Cambiar a modo oscuro" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("procontra-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Cambiar a modo claro" })).toBeInTheDocument();
  });

  it("keeps the theme control synchronized with the theme already applied before paint", async () => {
    document.documentElement.dataset.theme = "dark";
    storage.set("procontra-theme", "light");

    render(<AppShell><p>Contenido</p></AppShell>);

    const toggle = await screen.findByRole("button", { name: "Cambiar a modo claro" });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("procontra-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Cambiar a modo oscuro" })).toBeInTheDocument();
  });

  it("shows the authenticated identity and hides unauthorized modules", () => {
    render(
      <AppShell identity={{
        displayName: "Encargado Inventario",
        role: "inventory",
        branches: [{ id: "branch-70", code: "70", name: "Esperanza" }],
      }}>
        <p>Contenido</p>
      </AppShell>,
    );

    expect(screen.getByText("Encargado Inventario")).toBeInTheDocument();
    expect(screen.queryByText("Esperanza 70")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Inventario" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Pacientes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Administración" })).not.toBeInTheDocument();

    const bottomNavigation = screen.getByRole("navigation", { name: "Navegación inferior" });
    expect(within(bottomNavigation).getByRole("link", { name: "Inventario" })).toBeInTheDocument();
    expect(within(bottomNavigation).queryByRole("link", { name: "Pacientes" })).not.toBeInTheDocument();
  });

  it("asks for confirmation in a branded screen before ending the session", () => {
    render(<AppShell><p>Contenido</p></AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    const dialog = screen.getByRole("dialog", { name: "Confirmar cierre de sesión" });
    expect(within(dialog).getByRole("img", { name: "Farmacia La Línea" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "¿Desea cerrar la sesión?" })).toBeInTheDocument();
    expect(within(dialog).getByText("Abel Medrano")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    const confirm = within(dialog).getByRole("button", { name: "Sí, cerrar sesión" });
    expect(confirm.closest("form")).toHaveAttribute("action", "/api/auth/logout");
    expect(confirm.closest("form")).toHaveAttribute("method", "post");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Confirmar cierre de sesión" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the logout confirmation with Escape without ending the session", () => {
    render(<AppShell><p>Contenido</p></AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Confirmar cierre de sesión" })).not.toBeInTheDocument();
  });
});
