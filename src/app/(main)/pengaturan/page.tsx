"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  type OrganizationSettings,
} from "./actions";

export default function PengaturanPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrganizationSettings();
      setSettings(data);
      if (data) {
        setName(data.name);
        setPhone(data.phone || "");
        setAddress(data.address || "");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const showSuccess = (msg: string) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(null), 3000); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      await updateOrganizationSettings({ name, phone, address });
      showSuccess("Pengaturan berhasil disimpan");
      fetchSettings();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="text-sm text-slate-500 mt-1">
          Konfigurasi pengaturan aplikasi, profil usaha, dan preferensi pengguna.
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />{successMessage}
        </div>
      )}
      {formError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />{formError}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold">
            {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user?.displayName || "User"}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Organization Settings */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Profil Usaha</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Usaha</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={formLoading}
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug</label>
            <input type="text" value={settings?.slug || ""} disabled
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
            <p className="text-xs text-slate-400 mt-1">Slug tidak dapat diubah</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Telepon</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={formLoading}
              placeholder="Nomor telepon usaha"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} disabled={formLoading} rows={3}
              placeholder="Alamat lengkap usaha"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={formLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
              {formLoading ? (<><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>) : (<><Save className="w-4 h-4" />Simpan</>)}
            </button>
          </div>
        </form>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Keluar</h2>
        <p className="text-sm text-slate-500 mb-4">Keluar dari akun OrderFlow Anda.</p>
        <button onClick={() => setShowLogoutConfirm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors">
          <LogOut className="w-4 h-4" />Keluar
        </button>
      </div>

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4"><LogOut className="w-6 h-6 text-red-600" /></div>
            <h3 className="text-lg font-semibold text-slate-900 text-center">Keluar?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">Anda yakin ingin keluar dari akun?</p>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Batal</button>
              <button onClick={handleLogout} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors">Keluar</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-4">
        OrderFlow v0.1.0 — Sistem Manajemen Usaha
      </div>
    </div>
  );
}
