import { matchInvoiceLines, prepareInvoiceSubmission } from "./invoice-workflow";

const products = [
  { id: "p1", code: "001", barcode: "746000000001", name: "ACETAMINOFEN 500 MG TABLETAS" },
  { id: "p2", code: "002", barcode: "", name: "LOSARTAN 50 MG TABLETAS" },
];

describe("invoice photo workflow", () => {
  it("matches exact product codes and leaves missing products for human review", () => {
    expect(matchInvoiceLines([
      { description: "Acetaminofen", code: "001", quantity: 2 },
      { description: "Producto nuevo 10mg", code: "X9", quantity: 1 },
    ], products).map((line) => line.status)).toEqual(["matched", "product_missing"]);
  });

  it("rejects invalid quantities and requires a private image hash", () => {
    expect(() => prepareInvoiceSubmission({ source: "web", documentType: "purchase", hash: "", storagePath: "private/a.jpg", branchId: "b", lines: [] })).toThrow("Hash de imagen requerido");
    expect(() => prepareInvoiceSubmission({ source: "whatsapp", documentType: "purchase", hash: "a".repeat(64), storagePath: "private/a.jpg", branchId: "b", lines: [{ description: "X", quantity: 0 }] })).toThrow("Cantidad inválida");
  });
});
