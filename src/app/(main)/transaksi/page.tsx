"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  CreditCard,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatRupiah, formatTanggal, PAYMENT_METHODS, EXPENSE_CATEGORIES } from "@/lib/utils";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getTransactionStats,
  type Transaction,
  type CreateTransactionInput,
} from "./actions";

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ totalPemasukan: 0, totalPengeluaran: 0, countPemasukan: 0, countPengeluaran: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<CreateTransactionInput>({
    type: "pemasukan",
    amount: 0,
    description: "",
    payment_method: "",
    category: "",
  });
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        getTransactions(search || undefined, typeFilter || undefined),
        getTransactionStats(),
      ]);
      setTransactions(data);
      setStats(statsData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showSuccess = (msg: string) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(null), 3000); };

  const handleAdd = () => {
    setFormData({ type: "pemasukan", amount: 0, description: "", payment_method: "", category: "" });
    setCustomCategoryName("");
    setFormError(null);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      // If type is pengeluaran, validate category
      const submitData = { ...formData };
      if (submitData.type === "pengeluaran") {
        if (!submitData.category) {
          setFormError("Pilih kategori pengeluaran");
          setFormLoading(false);
          return;
        }
        if (submitData.category === "lainnya" && !customCategoryName.trim()) {
          setFormError("Isi nama kategori pengeluaran");
          setFormLoading(false);
          return;
        }
        if (submitData.category === "lainnya") {
          submitData.category = customCategoryName.trim();
        }
      } else {
        submitData.category = undefined;
      }
      await createTransaction(submitData);
      showSuccess("Transaksi berhasil dicatat");
      setShowDialog(false);
      fetchData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await deleteTransaction(deleteConfirm.id);
      showSuccess("Transaksi berhasil dihapus");
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menghapus");
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getMethodLabel = (method: string | null) => {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method || "-";
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return "-";
    const found = EXPENSE_CATEGORIES.find((c) => c.value === category);
    return found ? found.label : category;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transaksi</h1>
          <p className="text-sm text-slate-500 mt-1">Lihat dan kelola semua transaksi pembayaran masuk dan keluar.</p>
        </div>
        <button onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors">
          <Plus className="w-4 h-4" />Tambah Transaksi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-500" /></div>
            <div>
              <p className="text-sm text-slate-500">Total Pemasukan</p>
              <p className="text-xl font-bold text-green-600">{formatRupiah(stats.totalPemasukan)}</p>
              <p className="text-xs text-slate-400">{stats.countPemasukan} transaksi</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-500" /></div>
            <div>
              <p className="text-sm text-slate-500">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-600">{formatRupiah(stats.totalPengeluaran)}</p>
              <p className="text-xs text-slate-400">{stats.countPengeluaran} transaksi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"><CheckCircle className="w-4 h-4" />{successMessage}</div>
      )}
      {formError && !showDialog && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4" />{formError}</div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari transaksi..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
          <option value="">Semua Jenis</option>
          <option value="pemasukan">Pemasukan</option>
          <option value="pengeluaran">Pengeluaran</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4"><CreditCard className="w-6 h-6 text-slate-400" /></div>
            <p className="text-sm font-medium text-slate-600">{search || typeFilter ? "Tidak ada transaksi ditemukan" : "Belum ada transaksi"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-5 py-3 font-medium">Deskripsi</th>
                  <th className="px-5 py-3 font-medium">Jenis</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Kategori</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Metode</th>
                  <th className="px-5 py-3 font-medium text-right">Jumlah</th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-600">{formatTanggal(tx.transaction_date)}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{tx.description}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === "pemasukan" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {tx.type === "pemasukan" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {tx.type === "pemasukan" ? "Pemasukan" : "Pengeluaran"}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      {tx.type === "pengeluaran" ? (
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {getCategoryLabel(tx.category)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">{getMethodLabel(tx.payment_method)}</td>
                    <td className={`px-5 py-3 text-right font-medium ${tx.type === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                      {tx.type === "pemasukan" ? "+" : "-"}{formatRupiah(tx.amount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!tx.reference_type && (
                        <button onClick={() => setDeleteConfirm(tx)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Tambah Transaksi</h2>
              <button onClick={() => setShowDialog(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4 shrink-0" />{formError}</div>
              )}

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${formData.type === "pemasukan" ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="radio" name="type" value="pemasukan" checked={formData.type === "pemasukan"} onChange={() => setFormData({ ...formData, type: "pemasukan" })} className="sr-only" />
                    <TrendingUp className={`w-5 h-5 ${formData.type === "pemasukan" ? "text-green-600" : "text-slate-400"}`} />
                    <span className={`text-sm font-medium ${formData.type === "pemasukan" ? "text-green-700" : "text-slate-500"}`}>Pemasukan</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${formData.type === "pengeluaran" ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="radio" name="type" value="pengeluaran" checked={formData.type === "pengeluaran"} onChange={() => setFormData({ ...formData, type: "pengeluaran" })} className="sr-only" />
                    <TrendingDown className={`w-5 h-5 ${formData.type === "pengeluaran" ? "text-red-600" : "text-slate-400"}`} />
                    <span className={`text-sm font-medium ${formData.type === "pengeluaran" ? "text-red-700" : "text-slate-500"}`}>Pengeluaran</span>
                  </label>
                </div>
              </div>

              {/* Category (only for pengeluaran) */}
              {formData.type === "pengeluaran" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori <span className="text-red-500">*</span></label>
                    <select value={formData.category || ""} onChange={(e) => setFormData({ ...formData, category: e.target.value })} disabled={formLoading}
                      className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                      <option value="">Pilih kategori</option>
                      {EXPENSE_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                    </select>
                  </div>
                  {formData.category === "lainnya" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Kategori Pengeluaran <span className="text-red-500">*</span></label>
                      <input type="text" value={customCategoryName} onChange={(e) => setCustomCategoryName(e.target.value)}
                        placeholder="Contoh: Biaya Perbaikan Mesin" required disabled={formLoading}
                        className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                  )}
                </>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah <span className="text-red-500">*</span></label>
                <input type="number" value={formData.amount || ""} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} min="1" required disabled={formLoading}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi <span className="text-red-500">*</span></label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Deskripsi transaksi" required disabled={formLoading}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Metode Pembayaran</label>
                <select value={formData.payment_method || ""} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} disabled={formLoading}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="">Pilih metode</option>
                  {PAYMENT_METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal</label>
                <input type="date" value={formData.transaction_date || new Date().toISOString().split("T")[0]} onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} disabled={formLoading}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowDialog(false)} className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" disabled={formLoading}>Batal</button>
                <button type="submit" disabled={formLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {formLoading ? (<><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>) : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleteLoading && setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600" /></div>
            <h3 className="text-lg font-semibold text-slate-900 text-center">Hapus Transaksi?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">Anda yakin ingin menghapus transaksi &quot;{deleteConfirm.description}&quot;?</p>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" disabled={deleteLoading}>Batal</button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {deleteLoading ? (<><Loader2 className="w-4 h-4 animate-spin" />Menghapus...</>) : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
