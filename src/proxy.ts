import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { loadSupabaseConfig } from "@/infrastructure/supabase/config";
import { canAccessPath, isPublicPath } from "@/shared/auth/route-access";
import { appUrl } from "@/shared/auth/app-url";
import { isStaffRole } from "@/shared/auth/permissions";
import { mustChangePassword } from "@/shared/auth/password-reset";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname) && pathname !== "/ingresar") {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const config = loadSupabaseConfig(process.env);
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.PROCONTRA_COOKIE_SECURE === "true",
          });
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isPublicPath(pathname)) {
    return NextResponse.redirect(appUrl("/ingresar"));
  }
  if (user && pathname === "/ingresar") {
    return NextResponse.redirect(appUrl("/"));
  }
  if (user && mustChangePassword(user.user_metadata)) {
    return NextResponse.redirect(appUrl("/restablecer"));
  }
  if (user && pathname !== "/sin-acceso") {
    const { data: profile } = await supabase
      .schema("api")
      .from("t_perfiles")
      .select("f_rol,f_activo")
      .eq("f_uuid", user.id)
      .maybeSingle();
    if (!profile?.f_activo || !isStaffRole(profile.f_rol) || !canAccessPath(profile.f_rol, pathname)) {
      return NextResponse.redirect(appUrl("/sin-acceso"));
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
