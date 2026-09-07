/**
 * OrderFlow — Firebase Session Management
 *
 * Mengelola session cookie untuk autentikasi server-side.
 * Cookie ini di-set setelah user login dan diverifikasi
 * di middleware dan server components.
 *
 * ⚠️  File ini HANYA boleh di-import di sisi server.
 */

import { cookies } from "next/headers";
import {
  createFirebaseSessionCookie,
  verifyFirebaseSessionCookie,
} from "./admin";
import { getDb } from "../db/client";
import { generateId } from "../utils";

// ─── Konfigurasi Cookie ────────────────────────────────────────
export const SESSION_COOKIE_NAME = "orderflow_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari (dalam detik)

// ─── Tipe Data Session ─────────────────────────────────────────
export interface UserSession {
  firebaseUid: string;
  email: string;
  name: string;
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "staff";
}

// ─── Helper: Find or create organization by slug ────────────────
async function findOrCreateOrg(
  db: ReturnType<typeof getDb>,
  name: string,
  slug: string
): Promise<string> {
  const existing = await db.execute({
    sql: `SELECT id FROM organizations WHERE slug = ?`,
    args: [slug],
  });

  if (existing.rows.length > 0) {
    return existing.rows[0].id as string;
  }

  const orgId = generateId();
  await db.execute({
    sql: `INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)`,
    args: [orgId, name, slug],
  });
  return orgId;
}

// ─── Set Session Cookie ────────────────────────────────────────
export async function setSessionCookie(idToken: string): Promise<void> {
  const expiresIn = SESSION_MAX_AGE * 1000;

  const sessionCookie = await createFirebaseSessionCookie(
    idToken,
    expiresIn
  );

  if (!sessionCookie) {
    throw new Error("Gagal membuat Firebase session cookie");
  }

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}
// ─── Hapus Session Cookie ──────────────────────────────────────
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ─── Ambil Session dari Cookie ─────────────────────────────────
export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      console.error("[OrderFlow] Session cookie NOT found");
      return null;
    }

    // Verifikasi token Firebase
    console.time("[OrderFlow] Firebase verify");
    const decoded = await verifyFirebaseSessionCookie(sessionCookie.value);
    console.timeEnd("[OrderFlow] Firebase verify");
    if (!decoded || !decoded.uid) {
      console.error("[OrderFlow] Firebase session cookie verification FAILED");
      return null;
    }

    // Ambil data user dari Turso berdasarkan Firebase UID
    const db = getDb();

    // Cari user berdasarkan firebase_uid
    console.time("[OrderFlow] DB users");
    const userResult = await db.execute({
      sql: "SELECT id, email, name FROM users WHERE firebase_uid = ?",
      args: [decoded.uid],
    });
    console.timeEnd("[OrderFlow] DB users");

    if (userResult.rows.length === 0) {
      console.error("[OrderFlow] User NOT found in DB for firebase_uid:", decoded.uid.substring(0, 8) + "...");
      return null;
    }

    const user = userResult.rows[0];

    // Ambil organization pertama user
    console.time("[OrderFlow] DB organization");
    let orgResult = await db.execute({
      sql: `
        SELECT ou.organization_id, ou.role
        FROM organization_users ou
        WHERE ou.user_id = ?
        LIMIT 1
      `,
      args: [user.id as string],
    });
    console.timeEnd("[OrderFlow] DB organization");

    // ─── SELF-HEALING: If no organization exists, create one ──
    if (orgResult.rows.length === 0) {
      console.log("[OrderFlow] Self-healing: no org for user_id:", String(user.id).substring(0, 8) + "... creating now");

      const slug = ((user.email as string) || `org-${user.id}`)
        .replace(/@.*/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");

      // Find or create org (handle slug conflict)
      const orgId = await findOrCreateOrg(
        db,
        (user.name as string) || (user.email as string) || "My Organization",
        slug
      );

      const orgUserId = generateId();
      await db.execute({
        sql: `INSERT INTO organization_users (id, organization_id, user_id, role) VALUES (?, ?, ?, ?)`,
        args: [orgUserId, orgId, user.id as string, "owner"],
      });

      console.log("[OrderFlow] Self-healing complete: created org:", orgId);

      // Re-query to get the newly created organization
      orgResult = await db.execute({
        sql: `SELECT ou.organization_id, ou.role FROM organization_users ou WHERE ou.user_id = ? LIMIT 1`,
        args: [user.id as string],
      });
    }

    const org = orgResult.rows[0];

    return {
      firebaseUid: decoded.uid,
      email: decoded.email || (user.email as string),
      name: user.name as string,
      userId: user.id as string,
      organizationId: org.organization_id as string,
      role: org.role as "owner" | "admin" | "staff",
    };
  } catch (error) {
    console.error("[OrderFlow] Error getting session:", error);
    return null;
  }
}

// ─── Cek apakah user terautentikasi ─────────────────────────────
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
