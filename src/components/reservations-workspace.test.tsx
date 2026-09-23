import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ReservationsWorkspace } from "./reservations-workspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it("renders persisted reservation controls without demonstration data", () => {
  render(<ReservationsWorkspace branches={[]} canWrite={true} patients={[]} products={[]} query="" status="all" branchCode="" summary={{total:0,active:0,ready:0,expiringToday:0,expired:0}} result={{items:[],total:0,page:1,pageSize:25,totalPages:1}} />);
  expect(screen.getByRole("heading", { name: "Reservas" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Crear reserva" })).toBeInTheDocument();
  expect(screen.getByText("No hay reservas registradas.")).toBeInTheDocument();
  expect(screen.queryByText(/demostración/i)).not.toBeInTheDocument();
});
