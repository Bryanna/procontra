import { digitsOnly, formatPhoneNumber } from "./contact-format";

describe("contact formatting", () => {
  it("formats local and legacy country-code phones as ###-###-####", () => {
    expect(formatPhoneNumber("8095550101")).toBe("809-555-0101");
    expect(formatPhoneNumber("+1 (809) 555-0101")).toBe("809-555-0101");
  });

  it("accepts only ten phone digits and formats progressively", () => {
    expect(formatPhoneNumber("809a55")).toBe("809-55");
    expect(formatPhoneNumber("809a555b010199")).toBe("809-555-0101");
  });

  it("keeps cédula input numeric and limited to eleven digits", () => {
    expect(digitsOnly("001-A1234567-8 extra", 11)).toBe("00112345678");
  });
});
