import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginForm } from "./login-form";

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
});

describe("LoginForm", () => {
  it("renders an accessible server-side login form", () => {
    render(<LoginForm error="credenciales" />);

    expect(screen.getByRole("img", { name: "Farmacia La Línea" })).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Ingresar a PROCONTRA" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("No fue posible iniciar sesión");

    const form = screen.getByRole("button", { name: "Ingresar a PROCONTRA" }).closest("form");
    expect(form).toHaveAttribute("action", "/api/auth/login");
    expect(form).toHaveAttribute("method", "post");
  });

  it("stores the email when remembering credentials is selected", () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "admin@farmacialalinea.local" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Recordar credenciales/ }));
    fireEvent.submit(screen.getByRole("button", { name: "Ingresar a PROCONTRA" }).closest("form")!);

    expect(window.localStorage.getItem("procontra:remembered-email"))
      .toBe("admin@farmacialalinea.local");
    expect(window.localStorage.getItem("procontra:remembered-password")).toBeNull();
  });

  it("restores a remembered email on the next visit", async () => {
    window.localStorage.setItem("procontra:remembered-email", "admin@farmacialalinea.local");

    render(<LoginForm />);

    await waitFor(() => {
      expect(screen.getByLabelText("Correo electrónico"))
        .toHaveValue("admin@farmacialalinea.local");
    });
    expect(screen.getByRole("checkbox", { name: /Recordar credenciales/ })).toBeChecked();
  });

  it("forgets the saved email when the option is cleared", async () => {
    window.localStorage.setItem("procontra:remembered-email", "admin@farmacialalinea.local");
    render(<LoginForm />);

    const checkbox = await screen.findByRole("checkbox", { name: /Recordar credenciales/ });
    await waitFor(() => expect(checkbox).toBeChecked());
    fireEvent.click(checkbox);
    fireEvent.submit(screen.getByRole("button", { name: "Ingresar a PROCONTRA" }).closest("form")!);

    expect(window.localStorage.getItem("procontra:remembered-email")).toBeNull();
  });
});
