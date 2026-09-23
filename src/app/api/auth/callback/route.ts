import { NextResponse } from "next/server";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { appUrl } from "@/shared/auth/app-url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") ?? "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  if (!code) return NextResponse.redirect(appUrl("/ingresar?error=recuperacion"), 303);
  const supabase = await createSupabaseSessionClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(appUrl("/ingresar?error=recuperacion"), 303);
  return NextResponse.redirect(appUrl(next), 303);
}
