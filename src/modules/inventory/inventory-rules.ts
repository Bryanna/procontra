export interface InventoryPosition {
  onHand: number;
  reserved: number;
  reorderMinimum: number;
  updatedAt: string;
}

export interface ConfirmedReservation {
  id: string;
  quantity: number;
  status: "confirmed" | "collected" | "delivered" | "cancelled" | "expired";
  expiresAt: string;
  availableAfter: number;
  releasedQuantity?: number;
}

export function availableUnits(position: InventoryPosition) {
  return Math.max(0, position.onHand - position.reserved);
}

export function assessInventory(position: InventoryPosition) {
  const available = availableUnits(position);
  const status = available === 0 ? "out_of_stock" : available < position.reorderMinimum ? "below_minimum" : "available";
  return { available, status } as const;
}

export function confirmReservation(position: InventoryPosition, quantity: number, id: string, expiresAt: string) {
  const available = availableUnits(position);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { status: "rejected" as const, reason: "invalid_quantity" as const };
  }
  if (quantity > available) {
    return { status: "rejected" as const, reason: "insufficient_stock" as const };
  }
  return {
    id,
    quantity,
    status: "confirmed" as const,
    expiresAt,
    availableAfter: available - quantity,
  };
}

export function expireReservation(reservation: ConfirmedReservation, now: string): ConfirmedReservation {
  if (reservation.status !== "confirmed" || now < reservation.expiresAt) {
    return reservation;
  }
  return { ...reservation, status: "expired", releasedQuantity: reservation.quantity };
}
