/**
 * OrderFlow — Server-side Auth Helper
 *
 * Helper untuk mendapatkan session user di server components
 * dan server actions.
 *
 * ⚠️  File ini HANYA boleh di-import di sisi server.
 */

import { getSession, type UserSession } from "../firebase/session";
import { redirect } from "next/navigation";

// ─── Ambil session user (wajib login) ──────────────────────────
/**
 * Mendapatkan session user yang sedang login.
 * Jika tidak ada session, redirect ke /login.
 *
 * @example
 * ```ts
 * // Di Server Component
 * import { requireAuth } from "@/lib/auth/server";
 *
 * export default async function DashboardPage() {
 *   const session = await requireAuth();
 *   // session.organizationId tersedia
 * }
 * ```
 */
export async function requireAuth(): Promise<UserSession> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

// ─── Ambil session user (opsional) ─────────────────────────────
/**
 * Mendapatkan session user tanpa redirect.
 * Mengembalikan null jika tidak ada session.
 *
 * @example
 * ```ts
 * import { getOptionalAuth } from "@/lib/auth/server";
 *
 * const session = await getOptionalAuth();
 * if (session) {
 *   // User sedang login
 * }
 * ```
 */
export async function getOptionalAuth(): Promise<UserSession | null> {
  return getSession();
}

// ─── Cek role user ─────────────────────────────────────────────
/**
 * Cek apakah user memiliki role tertentu.
 *
 * @example
 * ```ts
 * const session = await requireAuth();
 * if (!hasRole(session, ["owner", "admin"])) {
 *   // Tidak punya akses
 * }
 * ```
 */
export function hasRole(
  session: UserSession,
  roles: Array<"owner" | "admin" | "staff">
): boolean {
  return roles.includes(session.role);
}

// ─── Cek apakah user adalah owner atau admin ───────────────────
/**
 * Cek apakah user memiliki akses admin (owner atau admin).
 */
export async function requireAdmin(): Promise<UserSession> {
  const session = await requireAuth();

  if (!hasRole(session, ["owner", "admin"])) {
    redirect("/dashboard");
  }

  return session;
}

// ─── Ambil organization ID dari session ────────────────────────
/**
 * Mendapatkan organization ID dari session user yang sedang login.
 * Berguna untuk query data bisnis yang terikat organization.
 *
 * @example
 * ```ts
 * const orgId = await getOrganizationId();
 * const orders = await queryMany(
 *   "SELECT * FROM orders WHERE organization_id = ?",
 *   [orgId]
 * );
 * ```
 */
export async function getOrganizationId(): Promise<string> {
  const session = await requireAuth();
  return session.organizationId;
}
