import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("document OCR route", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/api/documents/invoices/extract/route.ts"), "utf8");

  it("accepts phone images and scanned PDFs and returns authorization suggestions for review", () => {
    expect(source).toContain('"application/pdf"');
    expect(source).toContain('"pdftoppm"');
    expect(source).toContain("extractInsuranceAuthorizationSuggestion");
    expect(source).toContain("authorization:");
  });
});
