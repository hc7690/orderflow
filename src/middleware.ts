/**
 * OrderFlow — Next.js Middleware
 *
 * Melindungi route yang memerlukan autentikasi.
 * Hanya memeriksa keberadaan session cookie.
 * Verifikasi token asli dilakukan di server components/actions.
 */

import { type NextRequest, NextResponse } from "next/server";

// ─── Route yang dilindungi ─────────────────────────────────────
const PROTECTED_ROUTES = [
  "/dashboard",
  "/customer",
  "/produk",
  "/stok",
  "/order",
  "/pembelian",
  "/transaksi",
  "/cashflow",
  "/laporan",
  "/pengaturan",
];

// ─── Route yang hanya untuk user belum login ────────────────────
const AUTH_ROUTES = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek session cookie (httpOnly, tidak bisa diakses JS client)
  const sessionCookie = request.cookies.get("orderflow_session");
  const hasSession = Boolean(sessionCookie?.value);

  // Cek apakah route ini dilindungi
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Cek apakah route ini untuk halaman login
  const isAuthRoute = AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // ─── Jika mengakses route yang dilindungi ───────────────────
  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Jika mengakses halaman login tapi sudah login ──────────
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// ─── Konfigurasi Middleware ─────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - api routes (handled by Node.js runtime)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
