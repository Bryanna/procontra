import { extractProductLineSuggestions } from "./invoice-ocr";

describe("invoice OCR suggestions", () => {
  it("keeps visible candidate lines but never invents quantity or product code", () => {
    expect(extractProductLineSuggestions("FACTURA 100\n001 ACETAMINOFEN 500 MG\nTOTAL 250.00"))
      .toEqual([{ description: "001 ACETAMINOFEN 500 MG", code: "", barcode: "", quantity: "", unit: "", unitCost: "", lot: "", expiryDate: "" }]);
  });
});
