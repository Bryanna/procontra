import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("insurance authorization upload route", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/api/documents/authorizations/route.ts"), "utf8");

  it("stores the original privately and registers the reviewed authorization through the atomic RPC", () => {
    expect(source).toContain("requireDocumentWrite");
    expect(source).toContain("prepareInsuranceAuthorizationSubmission");
    expect(source).toContain('from("invoice-private")');
    expect(source).toContain("fn_registrar_autorizacion_continuidad");
    expect(source).toContain("PROCONTRA_PATIENT_DATA_KEY");
    expect(source).toContain("created === false");
  });
});
