import { fireEvent, render, screen, within } from "@testing-library/react";
import { LogoutConfirmation } from "./logout-confirmation";

describe("LogoutConfirmation", () => {
  it("does not expose the logout form until the user asks to close the session", () => {
    render(<LogoutConfirmation displayName="Dra. Leonela Tineo" />);
    expect(screen.queryByRole("dialog", { name: "Confirmar cierre de sesión" })).not.toBeInTheDocument();
    expect(document.querySelector('form[action="/api/auth/logout"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    const dialog = screen.getByRole("dialog", { name: "Confirmar cierre de sesión" });
    expect(within(dialog).getByText("Dra. Leonela Tineo")).toBeInTheDocument();
    expect(document.querySelector('form[action="/api/auth/logout"]')).toBeInTheDocument();
  });

  it("supports a full labeled trigger for access-controlled screens", () => {
    render(<LogoutConfirmation displayName="Usuario" triggerStyle="button" />);
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toHaveTextContent("Cerrar sesión");
  });
});