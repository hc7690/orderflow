"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { APP_NAME, APP_TAGLINE, COLORS } from "@/lib/constants";
import { useAuth } from "@/lib/auth/client";

// ─── Komponen Login Form (dibungkus Suspense) ──────────────────
function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const { login, loading: authLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // No useEffect redirect here — the middleware already handles redirecting
  // authenticated users away from /login. Adding a useEffect redirect creates
  // a race condition with handleSubmit that causes infinite reload loops.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // Use window.location.href to ensure a full page navigation.
      // This sends the session cookie with the request to the middleware.
      window.location.href = redirectTo;
    } catch (err) {
      console.error("Login error:", err);

      // Pesan error yang lebih user-friendly
      if (err instanceof Error) {
        if (err.message.includes("auth/invalid-credential")) {
          setError("Email atau kata sandi salah");
        } else if (err.message.includes("auth/user-not-found")) {
          setError("Email tidak terdaftar");
        } else if (err.message.includes("auth/wrong-password")) {
          setError("Kata sandi salah");
        } else if (err.message.includes("auth/too-many-requests")) {
          setError("Terlalu banyak percobaan. Coba lagi nanti");
        } else {
          setError("Terjadi kesalahan. Silakan coba lagi");
        }
      } else {
        setError("Terjadi kesalahan. Silakan coba lagi");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <h2 className="text-xl font-semibold text-slate-800 mb-6">
        Masuk ke Akun
      </h2>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contoh@domain.com"
            className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Tombol Masuk */}
        <button
          type="submit"
          disabled={loading || authLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Masuk
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Loading Fallback ──────────────────────────────────────────
function LoginLoading() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  );
}

// ─── Halaman Login ─────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo & Judul */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: COLORS.primary }}
          >
            <span className="text-white text-2xl font-bold">OF</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{APP_NAME}</h1>
          <p className="text-slate-500 mt-1">{APP_TAGLINE}</p>
        </div>

        {/* Form Login dengan Suspense */}
        <Suspense fallback={<LoginLoading />}>
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          &copy; 2026 {APP_NAME}. Hak cipta dilindungi.
        </p>
      </div>
    </div>
  );
}
