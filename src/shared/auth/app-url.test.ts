import { appUrl } from "./app-url";

describe("application URL", () => {
  it("builds redirects from the configured public origin", () => {
    expect(appUrl("/ingresar", { APP_URL: "http://93.127.215.188:3001" }).toString())
      .toBe("http://93.127.215.188:3001/ingresar");
  });

  it("rejects missing or non-http application origins", () => {
    expect(() => appUrl("/", {})).toThrow("APP_URL");
    expect(() => appUrl("/", { APP_URL: "javascript:alert(1)" })).toThrow("http");
  });
});
