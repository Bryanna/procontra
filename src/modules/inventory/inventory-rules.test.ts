import { availableUnits, assessInventory, confirmReservation, expireReservation } from "./inventory-rules";

describe("inventory and reservation rules", () => {
  const position = { onHand: 12, reserved: 3, reorderMinimum: 10, updatedAt: "2026-08-27T14:00:00Z" };

  it("calculates usable stock and flags low availability", () => {
    expect(availableUnits(position)).toBe(9);
    expect(assessInventory(position)).toEqual({ available: 9, status: "below_minimum" });
  });

  it("confirms a reservation only when capacity exists", () => {
    expect(confirmReservation(position, 2, "RES-0001", "2026-08-27T18:00:00Z")).toEqual({
      id: "RES-0001",
      quantity: 2,
      status: "confirmed",
      expiresAt: "2026-08-27T18:00:00Z",
      availableAfter: 7,
    });
    expect(confirmReservation(position, 10, "RES-0002", "2026-08-27T18:00:00Z")).toEqual({ status: "rejected", reason: "insufficient_stock" });
  });

  it("expires a confirmed reservation once and releases its quantity", () => {
    const reservation = { id: "RES-0001", quantity: 2, status: "confirmed" as const, expiresAt: "2026-08-27T18:00:00Z", availableAfter: 7 };
    expect(expireReservation(reservation, "2026-08-27T18:01:00Z")).toEqual({ ...reservation, status: "expired", releasedQuantity: 2 });
    expect(expireReservation({ ...reservation, status: "collected" }, "2026-08-27T18:01:00Z")).toEqual({ ...reservation, status: "collected" });
  });
});
