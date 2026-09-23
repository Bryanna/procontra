interface SupabaseProbe {
  error: { message: string } | null;
  count: number | null;
}

export type SupabaseHealth =
  | { service: "server"; status: "connected"; branchCount: number }
  | { service: "server"; status: "unavailable" };

export function summarizeSupabaseProbe(probe: SupabaseProbe): SupabaseHealth {
  if (probe.error) {
    return { service: "server", status: "unavailable" };
  }
  return {
    service: "server",
    status: "connected",
    branchCount: probe.count ?? 0,
  };
}
