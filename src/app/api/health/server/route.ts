import { NextResponse } from "next/server";

import { summarizeSupabaseProbe } from "@/infrastructure/supabase/connection-health";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const probe = await getSupabaseAdmin().schema("api").from("t_sucursales").select("f_id", { count: "exact", head: true });
    const health = summarizeSupabaseProbe(probe);
    return NextResponse.json(health, { status: health.status === "connected" ? 200 : 503 });
  } catch {
    return NextResponse.json({ service: "server", status: "unavailable" }, { status: 503 });
  }
}
