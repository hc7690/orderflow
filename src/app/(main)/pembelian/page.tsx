"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  ShoppingBag,
  Eye,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  Minus,
} from "lucide-react";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import {
  getPurchases,
  getPurchase,
  getPurchaseItems,
  createPurchase,
  updatePurchaseStatus,
  deletePurchase,
  getPurchaseStats,
  type Purchase,
  type PurchaseItem,
} from "./actions";
import { getActiveProducts, type Product } from "../produk/actions";

// ─── Tipe Data ─────────────────────────────────────────────────
interface PurchaseItemForm {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "dikonfirmasi", label: "Dikonfirmasi", color: "bg-blue-100 text-blue-700" },
  { value: "selesai", label: "Selesai", color: "bg-green-100 text-green-700" },
  { value: "dibatalkan", label: "Dibatalkan", color: "bg-red-100 text-red-700" },
];

export default function PembelianPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, inProgress: 0, completed: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showDetail, setShowDetail] = useState<Purchase | null>(null);
  const [detailItems, setDetailItems] = useState<PurchaseItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemForm[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Purchase | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        getPurchases(search || undefined, statusFilter || undefined),
        getPurchaseStats(),
      ]);
      setPurchases(data);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (showDialog) {
      getActiveProducts().then(setProducts);
    }
  }, [showDialog]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAdd = () => {
    setSupplierName("");
    setSupplierContact("");
    setPurchaseItems([]);
    setDiscount(0);
    setNotes("");
    setFormError(null);
    setShowDialog(true);
  };

  const handleViewDetail = async (purchase: Purchase) => {
    setDetailLoading(true);
    setShowDetail(purchase);
    try {
      const items = await getPurchaseItems(purchase.id);
      setDetailItems(items);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddItem = () => {
    setPurchaseItems([...purchaseItems, { product_id: "", product_code: "", product_name: "", quantity: 1, unit_price: 0 }]);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...purchaseItems];
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index] = { ...newItems[index], product_id: product.id, product_code: product.code, product_name: product.name, unit_price: product.cost_price };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setPurchaseItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const subtotal = purchaseItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    return subtotal - discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) { setFormError("Nama supplier wajib diisi"); return; }
    if (purchaseItems.length === 0) { setFormError("Tambahkan minimal 1 item"); return; }
    if (purchaseItems.some((item) => !item.product_id || item.quantity <= 0)) { setFormError("Pastikan semua item valid"); return; }

    setFormError(null);
    setFormLoading(true);

    try {
      await createPurchase({
        supplier_name: supplierName,
        supplier_contact: supplierContact || undefined,
        discount,
        notes: notes || undefined,
        items: purchaseItems,
      });
      showSuccess("Pembelian berhasil dibuat");
      setShowDialog(false);
      fetchData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateStatus = async (purchaseId: string, newStatus: string) => {
    try {
      await updatePurchaseStatus(purchaseId, newStatus as Purchase["status"]);
      showSuccess("Status pembelian berhasil diperbarui");
      setStatusDropdown(null);
      fetchData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal memperbarui status");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await deletePurchase(deleteConfirm.id);
      showSuccess("Pembelian berhasil dihapus");
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menghapus");
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getNextStatuses = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      draft: ["dikonfirmasi", "dibatalkan"],
      dikonfirmasi: ["selesai", "dibatalkan"],
    };
    return transitions[currentStatus] || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pembelian</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola order keluar dan pembelian dari supplier.</p>
        </div>
        <button onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors">
          <Plus className="w-4 h-4" />
          Buat Pembelian
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Draft</p>
          <p className="text-xl font-bold text-slate-900">{stats.draft}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Dalam Proses</p>
          <p className="text-xl font-bold text-slate-900">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Pengeluaran</p>
          <p className="text-lg font-bold text-slate-900">{formatRupiah(stats.totalSpent)}</p>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />{successMessage}
        </div>
      )}
      {formError && !showDialog && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />{formError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari pembelian..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">{search || statusFilter ? "Tidak ada pembelian ditemukan" : "Belum ada pembelian"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Kode</th>
                  <th className="px-5 py-3 font-medium">Supplier</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Tanggal</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const statusOpt = STATUS_OPTIONS.find((s) => s.value === purchase.status);
                  const nextStatuses = getNextStatuses(purchase.status);
                  return (
                    <tr key={purchase.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-600">{purchase.code}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{purchase.supplier_name}</p>
                        {purchase.supplier_contact && <p className="text-xs text-slate-400">{purchase.supplier_contact}</p>}
                      </td>
                      <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">{formatTanggal(purchase.purchase_date)}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800">{formatRupiah(purchase.total_amount)}</td>
                      <td className="px-5 py-3">
                        <div className="relative">
                          <button onClick={() => setStatusDropdown(statusDropdown === purchase.id ? null : purchase.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusOpt?.color || ""}`}>
                            {statusOpt?.label}{nextStatuses.length > 0 && <ChevronDown className="w-3 h-3" />}
                          </button>
                          {statusDropdown === purchase.id && nextStatuses.length > 0 && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setStatusDropdown(null)} />
                              <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                                {nextStatuses.map((s) => {
                                  const opt = STATUS_OPTIONS.find((o) => o.value === s);
                                  return (
                                    <button key={s} onClick={() => handleUpdateStatus(purchase.id, s)}
                                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                      <span className={`w-2 h-2 rounded-full ${s === "selesai" ? "bg-green-500" : s === "dibatalkan" ? "bg-red-500" : "bg-blue-500"}`} />
                                      {opt?.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleViewDetail(purchase)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Eye className="w-4 h-4" /></button>
                          {purchase.status === "draft" && (
                            <button onClick={() => setDeleteConfirm(purchase)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-900">Buat Pembelian Baru</h2>
              <button onClick={() => setShowDialog(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier <span className="text-red-500">*</span></label>
                  <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nama supplier" required disabled={formLoading}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Kontak</label>
                  <input type="text" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} placeholder="Telepon/wa" disabled={formLoading}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Item Pembelian <span className="text-red-500">*</span></label>
                  <button type="button" onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" />Tambah Item
                  </button>
                </div>
                {purchaseItems.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">Klik &quot;Tambah Item&quot;</div>
                ) : (
                  <div className="space-y-3">
                    {purchaseItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <select value={item.product_id} onChange={(e) => handleItemChange(index, "product_id", e.target.value)} required disabled={formLoading}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                              <option value="">Pilih Produk</option>
                              {products.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
                            </select>
                          </div>
                          <input type="number" value={item.quantity || ""} onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))} min="1" placeholder="Qty" required disabled={formLoading}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                          <div className="flex items-center gap-1">
                            <input type="number" value={item.unit_price || ""} onChange={(e) => handleItemChange(index, "unit_price", Number(e.target.value))} min="0" placeholder="Harga" required disabled={formLoading}
                              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                            <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" disabled={formLoading}><Minus className="w-4 h-4" /></button>
                          </div>
                        </div>
                        {item.product_id && <div className="text-sm font-medium text-slate-600 whitespace-nowrap pt-2">{formatRupiah(item.quantity * item.unit_price)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Diskon</label>
                  <input type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} min="0" placeholder="0" disabled={formLoading}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan" disabled={formLoading}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>

              {purchaseItems.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-600">Total</span>
                  <span className="text-lg font-bold text-slate-900">{formatRupiah(calculateTotal())}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowDialog(false)} className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" disabled={formLoading}>Batal</button>
                <button type="submit" disabled={formLoading || purchaseItems.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {formLoading ? (<><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>) : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetail(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Detail Pembelian</h2>
              <button onClick={() => setShowDetail(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-500">Kode</p><p className="font-mono font-medium text-slate-800">{showDetail.code}</p></div>
                <div><p className="text-xs text-slate-500">Status</p><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_OPTIONS.find((s) => s.value === showDetail.status)?.color}`}>{STATUS_OPTIONS.find((s) => s.value === showDetail.status)?.label}</span></div>
                <div><p className="text-xs text-slate-500">Supplier</p><p className="font-medium text-slate-800">{showDetail.supplier_name}</p></div>
                <div><p className="text-xs text-slate-500">Tanggal</p><p className="text-slate-800">{formatTanggal(showDetail.purchase_date)}</p></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Item</p>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-slate-500 bg-slate-50"><th className="px-4 py-2 font-medium">Produk</th><th className="px-4 py-2 font-medium text-right">Qty</th><th className="px-4 py-2 font-medium text-right">Harga</th><th className="px-4 py-2 font-medium text-right">Subtotal</th></tr></thead>
                      <tbody>
                        {detailItems.map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-4 py-2"><p className="font-medium text-slate-800">{item.product_name}</p><p className="text-xs text-slate-400 font-mono">{item.product_code}</p></td>
                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-right">{formatRupiah(item.unit_price)}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-200">
                {showDetail.discount > 0 && (<div className="flex justify-between text-sm"><span className="text-slate-500">Diskon</span><span className="text-red-600">-{formatRupiah(showDetail.discount)}</span></div>)}
                <div className="flex justify-between"><span className="font-medium text-slate-700">Total</span><span className="text-lg font-bold text-slate-900">{formatRupiah(showDetail.total_amount)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleteLoading && setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600" /></div>
            <h3 className="text-lg font-semibold text-slate-900 text-center">Hapus Pembelian?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">Anda yakin ingin menghapus <span className="font-medium text-slate-700">{deleteConfirm.code}</span>?</p>
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
