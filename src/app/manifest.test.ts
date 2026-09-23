import manifest from "./manifest";

describe("mobile app manifest", () => {
  it("declares PROCONTRA as an installable standalone app", () => {
    const value = manifest();

    expect(value.name).toBe("PROCONTRA · Farmacia La Línea");
    expect(value.display).toBe("standalone");
    expect(value.start_url).toBe("/");
    expect(value.theme_color).toBe("#0e667d");
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/brand/app-icon-192.png", sizes: "192x192" }),
    ]));
  });
});
