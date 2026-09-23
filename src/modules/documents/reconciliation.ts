export interface OperationalDocument {
  id: string;
  type: "invoice" | "authorization" | "prescription" | "other";
  reference: string;
  hash: string;
  patientId: string;
  productCode: string;
  quantity: number;
}

export interface ReconciledDispensation {
  id: string;
  patientId: string;
  productCode: string;
  quantity: number;
  documentIds: string[];
}

export function reconcileDocuments(documents: OperationalDocument[]) {
  const hashes = new Set(documents.map((document) => document.hash));
  if (hashes.size !== documents.length) {
    return { status: "duplicate_detected" as const, dispensations: [], inventoryMovements: [] };
  }

  const invoice = documents.find((document) => document.type === "invoice");
  const authorization = documents.find((document) => document.type === "authorization");
  if (!invoice || !authorization) {
    return { status: "review_required" as const, dispensations: [], inventoryMovements: [] };
  }

  const sameOperation = invoice.patientId === authorization.patientId
    && invoice.productCode === authorization.productCode
    && invoice.quantity === authorization.quantity;
  if (!sameOperation) {
    return { status: "review_required" as const, dispensations: [], inventoryMovements: [] };
  }

  const id = `DSP-${invoice.patientId}-${invoice.productCode}-${invoice.reference}`;
  const dispensation: ReconciledDispensation = {
    id,
    patientId: invoice.patientId,
    productCode: invoice.productCode,
    quantity: invoice.quantity,
    documentIds: [authorization.id, invoice.id],
  };
  return {
    status: "reconciled" as const,
    dispensations: [dispensation],
    inventoryMovements: [{ id: `MOV-${id}`, dispensationId: id, quantity: -invoice.quantity }],
  };
}
