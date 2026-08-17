import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/server/auth/config";
import { UserRole } from "@/lib/enums";

// Edge-safe auth instance (no DB/Credentials providers here).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const token = req.auth;
  const isLoggedIn = Boolean(token?.user?.id);
  const isAdmin = token?.user?.role === UserRole.ADMIN;

  const path = nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isAdminArea = path.startsWith("/admin");

  // Admin area: must be logged in AND admin.
  if (isAdminArea) {
    if (!isLoggedIn) return redirectToLogin(nextUrl);
    if (!isAdmin) return NextResponse.redirect(new URL("/dashboard", nextUrl));
    return NextResponse.next();
  }

  // User dashboard: must be logged in.
  if (isDashboard && !isLoggedIn) {
    return redirectToLogin(nextUrl);
  }

  // Logged-in users shouldn't see auth pages.
  if (isLoggedIn && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL(isAdmin ? "/admin" : "/dashboard", nextUrl));
  }

  return NextResponse.next();
});

function redirectToLogin(nextUrl: URL) {
  const url = new URL("/login", nextUrl);
  url.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on app routes, excluding static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
