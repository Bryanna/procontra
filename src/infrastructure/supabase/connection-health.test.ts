import { summarizeSupabaseProbe } from "./connection-health";

describe("server connection health", () => {
  it("reports a connected server and its branch count", () => {
    expect(summarizeSupabaseProbe({ error: null, count: 4 })).toEqual({
      service: "server",
      status: "connected",
      branchCount: 4,
    });
  });

  it("does not expose database error details", () => {
    const result = summarizeSupabaseProbe({
      error: { message: "password secret leaked in connection failure" },
      count: null,
    });

    expect(result).toEqual({ service: "server", status: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
