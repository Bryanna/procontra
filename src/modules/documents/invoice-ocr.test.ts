import { extractInsuranceAuthorizationSuggestion, extractProductLineSuggestions } from "./invoice-ocr";

describe("invoice OCR suggestions", () => {
  it("keeps visible candidate lines but never invents quantity or product code", () => {
    expect(extractProductLineSuggestions("FACTURA 100\n001 ACETAMINOFEN 500 MG\nTOTAL 250.00"))
      .toEqual([{ description: "001 ACETAMINOFEN 500 MG", code: "", barcode: "", quantity: "", unit: "", unitCost: "", lot: "", expiryDate: "" }]);
  });

  it("extracts reviewable fields from an ARS authorization without inventing missing values", () => {
    const raw = `ARS PRIMERA
Prescriptor: YESENIA HIRALDO GONZALEZ
Nombre Afiliado: LOREZA BERNARDA GOMEZ CLASE
Cedula Afiliado: 00110837317
Carne Afiliado: 1063071401
Telefono Suministrado: 8297062116
AUTORIZADO
ATORVASTATINA LAM 40 MG TABS X DET 1
GLUCONIL 25 MG TABS REC X DET 1
Autorizacion: P26333348279614
Fecha Autorizacion: 2026-09-22
Tipo Receta: USO CONTINUO`;

    expect(extractInsuranceAuthorizationSuggestion(raw)).toEqual({
      insurerCode: "primera",
      insurerName: "ARS PRIMERA",
      patientName: "LOREZA BERNARDA GOMEZ CLASE",
      governmentId: "00110837317",
      insuranceCard: "1063071401",
      phone: "8297062116",
      authorizationNumber: "P26333348279614",
      authorizationDate: "2026-09-22",
      prescriber: "YESENIA HIRALDO GONZALEZ",
      authorized: true,
      continuousUse: true,
      medicines: [
        { medicine: "ATORVASTATINA LAM 40 MG TABS X DET 1", quantity: "1" },
        { medicine: "GLUCONIL 25 MG TABS REC X DET 1", quantity: "1" },
      ],
    });
  });
});
