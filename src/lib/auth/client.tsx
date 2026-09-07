"use client";

/**
 * OrderFlow — Client-side Auth Context
 *
 * Context untuk autentikasi di sisi client (browser).
 * Menyediakan state auth dan fungsi login/logout.
 *
 * ⚠️  File ini menggunakan "use client" dan hanya boleh
 *     di-import di komponen client.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// ─── Tipe Data ─────────────────────────────────────────────────
interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ───────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Dengarkan perubahan state auth
  useEffect(() => {
    // Periksa apakah auth sudah terinisialisasi
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ─── Login ───────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase Auth belum terinisialisasi");
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Dapatkan ID token
    const idToken = await userCredential.user.getIdToken();

    // Kirim token ke server untuk set session cookie
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error("Gagal membuat session");
    }

    // Session server sudah berhasil dibuat
    // Caller (login page) akan handle redirect
  }, []);

  // ─── Logout ──────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (!auth) {
      throw new Error("Firebase Auth belum terinisialisasi");
    }

    // Hapus session di server
    await fetch("/api/auth/session", {
      method: "DELETE",
    });

    // Sign out dari Firebase
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook untuk akses auth ─────────────────────────────────────
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }

  return context;
}
