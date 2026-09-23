import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Supabase schema", () => {
  it("defines the operational records, idempotency controls and RLS", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/0001_procontra_core.sql"), "utf8");
    const tables = ["branches", "profiles", "patients", "consents", "products", "inventory_positions", "documents", "dispensations", "inventory_movements", "continuity_cycles", "alerts", "reservations", "tasks", "audit_events", "outbox_events"];

    for (const table of tables) expect(sql).toContain(`create table public.${table}`);
    expect(sql).toContain("unique (source_scope, content_hash)");
    expect(sql).toContain("unique (dispensation_id, movement_type)");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("service_role");
  });
});
