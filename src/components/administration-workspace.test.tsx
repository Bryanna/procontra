import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AdministrationWorkspace, type AdministrationData } from "./administration-workspace";

const data: AdministrationData = {
  branches: [
    { id: "branch-70", code: "70", name: "Esperanza" },
    { id: "branch-01", code: "01", name: "Amina" },
  ],
  accounts: [{
    id: "admin-1",
    displayName: "Abel Administrador",
    email: "admin@example.com",
    role: "administrator",
    active: true,
    branchIds: ["branch-70"],
    branches: [{ id: "branch-70", code: "70", name: "Esperanza" }],
    lastSignInAt: "2026-08-27T12:00:00Z",
    createdAt: "2026-08-01T00:00:00Z",
  }],
  auditEvents: [{
    id: "audit-1",
    eventType: "staff.created",
    entityId: "admin-1",
    actorName: "Sistema",
    createdAt: "2026-08-01T00:00:00Z",
    metadata: { role: "administrator" },
  }],
};

describe("AdministrationWorkspace", () => {
  it("shows real employees, access state, last sign-in and audit events", () => {
    render(<AdministrationWorkspace currentUserId="admin-1" initialData={data} />);

    expect(screen.getByRole("heading", { name: "Administración de empleados" })).toBeInTheDocument();
    expect(screen.getByText("Abel Administrador")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("Esperanza 70")).toBeInTheDocument();
    expect(screen.getByText(/Último ingreso/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Auditoría reciente" })).toBeInTheDocument();
    expect(screen.getByText("Empleado creado")).toBeInTheDocument();
  });

  it("provides role and branch controls when creating an employee", () => {
    render(<AdministrationWorkspace currentUserId="admin-1" initialData={data} />);

    expect(screen.getByLabelText("Nombre completo")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Rol")).toBeInTheDocument();
    expect(screen.getByLabelText("Esperanza 70")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear empleado" })).toBeInTheDocument();
  });

  it("opens employee editing and prevents the current account from being deactivated", () => {
    render(<AdministrationWorkspace currentUserId="admin-1" initialData={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Abel Administrador" }));

    expect(screen.getByRole("heading", { name: "Editar empleado" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cuenta activa")).toBeDisabled();
    expect(screen.getByText("No puede desactivar su propia cuenta.")).toBeInTheDocument();
  });

  it("shows the one-time recovery link returned by the server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recoveryLink: "https://example.com/recovery" }),
    }));
    render(<AdministrationWorkspace currentUserId="other-admin" initialData={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Abel Administrador" }));
    fireEvent.click(screen.getByRole("button", { name: "Restablecer acceso" }));

    await waitFor(() => expect(screen.getByDisplayValue("https://example.com/recovery")).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
