import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { neon } from "@neondatabase/serverless";

/**
 * Runs before every matched request:
 * 1. Optimistic auth gate for /dashboard and /admin (cookie presence only; layouts, Server Actions
 *    and Route Handlers re-check the session and role on every request).
 * 2. Lowercase URL normalization for public pages (301).
 * Renamed slugs are redirected by the pages themselves (lib/redirects.ts), so the proxy never hits the database.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    const cookie = getSessionCookie(request, { cookiePrefix: "ld" });
    if (!cookie) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    // The admin area is checked here, before anything renders: signed-in users who aren't
    // admin/editor get a real 404 (no redirect, and no part of an admin page is ever sent).
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      const role = await sessionRole(cookie);
      if (role !== "admin" && role !== "editor") {
        return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
      }
    }
    return NextResponse.next();
  }

  if (pathname !== pathname.toLowerCase() && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL(pathname.toLowerCase() + search, request.url), 301);
  }
  return NextResponse.next();
}

/**
 * Role of the signed-in user, read straight from Neon (admin routes only).
 * The session cookie is "<token>.<signature>"; the token is a long random secret stored in sessions.token,
 * so a matching, unexpired row proves the session. One indexed query, never rate-limited.
 */
async function sessionRole(cookieValue: string): Promise<string | null> {
  const token = decodeURIComponent(cookieValue).split(".")[0];
  if (!token || !process.env.DATABASE_URL) return null;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = (await sql`
      select u.role from sessions s join users u on u.id = s.user_id
      where s.token = ${token} and s.expires_at > now() and coalesce(u.banned, false) = false
      limit 1`) as { role: string }[];
    return rows[0]?.role ?? null;
  } catch (e) {
    console.error("[proxy] admin role check failed", e);
    return null;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest|robots.txt|sitemap|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|txt|xml)$).*)"],
};
