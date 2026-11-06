import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/paths";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

const PROTECTED = [
  /^\/home/,
  /^\/wishes/,
  /^\/wish\/new/,
  /^\/wish\/[^/]+\/edit/,
  /^\/collections$/,
  /^\/gifts/,
  /^\/saved/,
  /^\/occasions/,
  /^\/notifications/,
  /^\/settings/,
  /^\/menu/,
  /^\/onboarding/,
];
const GUEST_ONLY = ["/login", "/signup", "/forgot-password"];

/** Keeps the login session fresh and does the first-pass redirects. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && PROTECTED.some((route) => route.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (user && GUEST_ONLY.includes(pathname)) {
    const url = new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
