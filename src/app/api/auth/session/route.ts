/**
 * OrderFlow — Session API Route
 *
 * Endpoint untuk mengelola session cookie:
 * - POST /api/auth/session — Set session cookie + auto-provision user
 * - DELETE /api/auth/session — Hapus session cookie
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/firebase/session";
import {
  createFirebaseSessionCookie,
  verifyFirebaseToken,
} from "@/lib/firebase/admin";
import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/utils";

// ─── Helper: Find or create organization by slug ────────────────
async function findOrCreateOrg(
  db: ReturnType<typeof getDb>,
  name: string,
  slug: string
): Promise<string> {
  // Try to find existing org by slug first
  const existing = await db.execute({
    sql: `SELECT id FROM organizations WHERE slug = ?`,
    args: [slug],
  });

  if (existing.rows.length > 0) {
    return existing.rows[0].id as string;
  }

  // Create new org
  const orgId = generateId();
  await db.execute({
    sql: `INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)`,
    args: [orgId, name, slug],
  });
  return orgId;
}

// ─── POST: Set Session + Auto-provision User ──────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: "ID Token diperlukan" },
        { status: 400 }
      );
    }

    // Verifikasi token Firebase
    const decoded = await verifyFirebaseToken(idToken);
    if (!decoded || !decoded.uid) {
      return NextResponse.json(
        { error: "Token tidak valid" },
        { status: 401 }
      );
    }

    const db = getDb();
    const firebaseUid = decoded.uid;

    // ─── Cek apakah user sudah ada di database ──────────────────
    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE firebase_uid = ?",
      args: [firebaseUid],
    });

    let userId: string;

    if (existingUser.rows.length === 0) {
      // ─── AUTO-PROVISION: Buat user + organization baru ──────
      console.log(`[OrderFlow] Auto-provisioning new user: ${decoded.email}`);

      userId = generateId();
      const slug = (decoded.email || `org-${userId}`)
        .replace(/@.*/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");

      // 1. Buat user
      await db.execute({
        sql: `INSERT INTO users (id, firebase_uid, email, name) VALUES (?, ?, ?, ?)`,
        args: [
          userId,
          firebaseUid,
          decoded.email || "",
          decoded.name || decoded.email || "User",
        ],
      });

      // 2. Buat or find organization (handle slug conflict)
      const orgId = await findOrCreateOrg(
        db,
        decoded.name || decoded.email || "My Organization",
        slug
      );

      // 3. Link user → organization sebagai owner
      const orgUserId = generateId();
      await db.execute({
        sql: `INSERT INTO organization_users (id, organization_id, user_id, role) VALUES (?, ?, ?, ?)`,
        args: [orgUserId, orgId, userId, "owner"],
      });

      console.log(`[OrderFlow] User provisioned: ${userId}, org: ${orgId}`);
    } else {
      userId = existingUser.rows[0].id as string;

      // ─── SELF-HEALING: Cek apakah user punya organization ──
      const existingOrg = await db.execute({
        sql: `SELECT id FROM organization_users WHERE user_id = ? LIMIT 1`,
        args: [userId],
      });

      if (existingOrg.rows.length === 0) {
        // User exists tapi tidak punya organization — buat sekarang
        console.log(
          `[OrderFlow] Self-healing: creating org for existing user: ${decoded.email}`
        );

        const slug = (decoded.email || `org-${userId}`)
          .replace(/@.*/, "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-");

        // Find or create org (handle slug conflict)
        const orgId = await findOrCreateOrg(
          db,
          decoded.name || decoded.email || "My Organization",
          slug
        );

        const orgUserId = generateId();
        await db.execute({
          sql: `INSERT INTO organization_users (id, organization_id, user_id, role) VALUES (?, ?, ?, ?)`,
          args: [orgUserId, orgId, userId, "owner"],
        });

        console.log(`[OrderFlow] Self-healing complete: created org: ${orgId}`);
      }
    }

    // ─── Create Firebase session cookie ──────────────────────
    const sessionCookie = await createFirebaseSessionCookie(
      idToken,
      SESSION_MAX_AGE * 1000
    );

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Gagal membuat session cookie" },
        { status: 500 }
      );
    }

    // ─── Build response with cookie set DIRECTLY on response ──
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[OrderFlow] Session set error:", error);
    return NextResponse.json(
      { error: "Gagal membuat session" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Clear Session ─────────────────────────────────────
export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("[OrderFlow] Session clear error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus session" },
      { status: 500 }
    );
  }
}
