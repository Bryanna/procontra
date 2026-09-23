import { reconcileDocuments } from "./reconciliation";

describe("document reconciliation", () => {
  it("links invoice and authorization to one dispensation and movement", () => {
    const result = reconcileDocuments([
      { id: "DOC-1", type: "authorization", reference: "AUTH-77", hash: "hash-a", patientId: "PAT-1", productCode: "P-1", quantity: 1 },
      { id: "DOC-2", type: "invoice", reference: "FAC-99", hash: "hash-b", patientId: "PAT-1", productCode: "P-1", quantity: 1 },
    ]);

    expect(result.status).toBe("reconciled");
    expect(result.dispensations).toHaveLength(1);
    expect(result.inventoryMovements).toHaveLength(1);
    expect(result.dispensations[0].documentIds).toEqual(["DOC-1", "DOC-2"]);
  });

  it("does not create another operation for a duplicate image", () => {
    const result = reconcileDocuments([
      { id: "DOC-1", type: "invoice", reference: "FAC-99", hash: "same", patientId: "PAT-1", productCode: "P-1", quantity: 1 },
      { id: "DOC-2", type: "invoice", reference: "FAC-99", hash: "same", patientId: "PAT-1", productCode: "P-1", quantity: 1 },
    ]);

    expect(result.status).toBe("duplicate_detected");
    expect(result.dispensations).toHaveLength(0);
    expect(result.inventoryMovements).toHaveLength(0);
  });
});
