/**
 * OrderFlow — Firebase Admin Configuration
 *
 * Konfigurasi Firebase Admin SDK untuk penggunaan di sisi server.
 * Digunakan untuk verifikasi token di middleware dan server actions.
 *
 * ⚠️  File ini HANYA boleh di-import di sisi server.
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

// ─── Inisialisasi Firebase Admin (singleton) ────────────────────
let adminApp: App;
let adminAuth: Auth;

function getFirebaseAdmin(): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // Konfigurasi dari environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[OrderFlow] Firebase Admin credentials belum diatur. " +
        "Silakan isi FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, dan FIREBASE_PRIVATE_KEY di .env.local"
    );
  }

  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return adminApp;
}

/**
 * Mendapatkan instance Firebase Admin Auth.
 * Digunakan untuk verifikasi token dan manage user.
 */
export function getAdminAuth(): Auth {
  if (adminAuth) return adminAuth;

  const app = getFirebaseAdmin();
  adminAuth = getAuth(app);
  return adminAuth;
}

/**
 * Verifikasi Firebase ID token.
 * Mengembalikan decoded token atau null jika tidak valid.
 *
 * @example
 * ```ts
 * const token = await verifyFirebaseToken(idToken);
 * if (token) {
 *   console.log(token.uid, token.email);
 * }
 * ```
 */
export async function verifyFirebaseToken(idToken: string) {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("[OrderFlow] Token verification failed:", error);
    return null;
  }
}

export async function createFirebaseSessionCookie(
  idToken: string,
  expiresIn: number
): Promise<string | null> {
  try {
    const auth = getAdminAuth();
    return await auth.createSessionCookie(idToken, { expiresIn });
  } catch (error) {
    console.error("[OrderFlow] Failed to create session cookie:", error);
    return null;
  }
}

export async function verifyFirebaseSessionCookie(
  sessionCookie: string
) {
  try {
    const auth = getAdminAuth();
    return await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    console.error("[OrderFlow] Session cookie verification failed:", error);
    return null;
  }
}
