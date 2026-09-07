"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Minus,
  Search,
  Boxes,
  AlertTriangle,
  XCircle,
  X,
  History,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { formatTanggal } from "@/lib/utils";
import {
  getStockProducts,
  getStockMovements,
  createStockMovement,
  getStockStats,
  type StockProduct,
  type StockMovement,
} from "./actions";
import { notifyRefresh } from "@/lib/notifications-refresh";

// ─── Komponen Utama ────────────────────────────────────────────
export default function StokPage() {
  // State
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [movements, setMovements] = useState<
    (StockMovement & { product_name: string; product_code: string })[]
  >([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(
    null
  );
  const [movementType, setMovementType] = useState<"masuk" | "keluar">("masuk");
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string>("");

  // ─── Fetch Data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsData, movementsData, statsData] = await Promise.all([
        getStockProducts(search || undefined),
        getStockMovements(historyFilter || undefined),
        getStockStats(),
      ]);
      setProducts(productsData);
      setMovements(movementsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    } finally {
      setLoading(false);
    }
  }, [search, historyFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Auto-search when highlight param is present (once) ─────
  useEffect(() => {
    if (products.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get("highlight");
    if (!highlightId) return;
    const match = products.find((p) => p.id === highlightId);
    if (match) {
      setSearch(match.name);
      setActiveTab("stock");
      // Clean URL to prevent re-triggering
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [products]);

  // ─── Show success message ────────────────────────────────────
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ─── Open Stock Dialog ───────────────────────────────────────
  const handleOpenDialog = (
    product: StockProduct,
    type: "masuk" | "keluar"
  ) => {
    setSelectedProduct(product);
    setMovementType(type);
    setQuantity(0);
    setNotes("");
    setFormError(null);
    setShowDialog(true);
  };

  // ─── Submit Stock Movement ───────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFormError(null);
    setFormLoading(true);

    try {
      await createStockMovement({
        product_id: selectedProduct.id,
        type: movementType,
        quantity,
        notes: notes || undefined,
      });
      showSuccess(
        `Stok ${movementType === "masuk" ? "masuk" : "keluar"} berhasil dicatat`
      );
      setShowDialog(false);
      fetchData();
      notifyRefresh();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Terjadi kesalahan"
      );
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Close dialog on Escape ──────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDialog(false);
    }
  };

  // ─── Movement type label ─────────────────────────────────────
  const movementTypeLabel = (type: string) => {
    switch (type) {
      case "masuk":
        return { label: "Masuk", color: "bg-green-100 text-green-700" };
      case "keluar":
        return { label: "Keluar", color: "bg-red-100 text-red-700" };
      case "penyesuaian":
        return { label: "Penyesuaian", color: "bg-blue-100 text-blue-700" };
      default:
        return { label: type, color: "bg-slate-100 text-slate-700" };
    }
  };

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manajemen Stok</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pantau dan kelola stok barang, masuk-keluar, serta riwayat inventori.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Produk</p>
              <p className="text-xl font-bold text-slate-900">
                {stats.totalProducts}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Stok Menipis</p>
              <p className="text-xl font-bold text-slate-900">{stats.lowStock}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Habis</p>
              <p className="text-xl font-bold text-slate-900">
                {stats.outOfStock}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {formError && !showDialog && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {formError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "stock"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Boxes className="w-4 h-4 inline mr-1.5" />
          Stok Saat Ini
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "history"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4 inline mr-1.5" />
          Riwayat
        </button>
      </div>

      {/* Stock Tab */}
      {activeTab === "stock" && (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Boxes className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {search ? "Tidak ada produk ditemukan" : "Belum ada produk"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {search ? "Coba kata kunci lain" : "Tambahkan produk terlebih dahulu"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="px-5 py-3 font-medium">Kode</th>
                      <th className="px-5 py-3 font-medium">Nama</th>
                      <th className="px-5 py-3 font-medium text-right">Stok</th>
                      <th className="px-5 py-3 font-medium text-right">
                        Stok Min
                      </th>
                      <th className="px-5 py-3 font-medium text-center">
                        Status
                      </th>
                      <th className="px-5 py-3 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const isLowStock =
                        product.min_stock > 0 &&
                        product.current_stock <= product.min_stock;
                      const isOut = product.current_stock === 0;

                      return (
                        <tr
                          key={product.id}
                          className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-5 py-3 font-mono text-slate-600">
                            {product.code}
                          </td>
                          <td className="px-5 py-3">
                            <div>
                              <p className="font-medium text-slate-800">
                                {product.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {product.unit}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span
                              className={`text-lg font-bold ${
                                isOut
                                  ? "text-red-600"
                                  : isLowStock
                                    ? "text-amber-600"
                                    : "text-slate-800"
                              }`}
                            >
                              {product.current_stock}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-500">
                            {product.min_stock}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {isOut ? (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                Habis
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                Menipis
                              </span>
                            ) : (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Aman
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() =>
                                  handleOpenDialog(product, "masuk")
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Masuk
                              </button>
                              <button
                                onClick={() =>
                                  handleOpenDialog(product, "keluar")
                                }
                                disabled={product.current_stock === 0}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-3.5 h-3.5" />
                                Keluar
                              </button>
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
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <>
          {/* Filter */}
          <div className="flex items-center gap-3">
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">Semua Jenis</option>
              <option value="masuk">Masuk</option>
              <option value="keluar">Keluar</option>
              <option value="penyesuaian">Penyesuaian</option>
            </select>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <History className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  Belum ada riwayat pergerakan stok
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="px-5 py-3 font-medium">Tanggal</th>
                      <th className="px-5 py-3 font-medium">Produk</th>
                      <th className="px-5 py-3 font-medium">Jenis</th>
                      <th className="px-5 py-3 font-medium text-right">
                        Jumlah
                      </th>
                      <th className="px-5 py-3 font-medium">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => {
                      const typeInfo = movementTypeLabel(movement.type);
                      return (
                        <tr
                          key={movement.id}
                          className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-5 py-3 text-slate-600">
                            {formatTanggal(movement.movement_date)}
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-800">
                              {movement.product_name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {movement.product_code}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}
                            >
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-slate-800">
                            {movement.quantity}
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {movement.notes || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Stock Movement Dialog */}
      {showDialog && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDialog(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Stok {movementType === "masuk" ? "Masuk" : "Keluar"}
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Product Info */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-800">
                  {selectedProduct.name}
                </p>
                <p className="text-xs text-slate-500">
                  Stok saat ini:{" "}
                  <span className="font-medium text-slate-700">
                    {selectedProduct.current_stock} {selectedProduct.unit}
                  </span>
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Jumlah <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={quantity || ""}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="1"
                  placeholder="0"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                  disabled={formLoading}
                  autoFocus
                />
                {movementType === "keluar" && quantity > selectedProduct.current_stock && (
                  <p className="text-xs text-red-500 mt-1">
                    Jumlah melebihi stok yang tersedia
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Catatan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan (opsional)"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={formLoading}
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={formLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    formLoading ||
                    quantity <= 0 ||
                    (movementType === "keluar" &&
                      quantity > selectedProduct.current_stock)
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                    movementType === "masuk"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {movementType === "masuk" ? (
                        <Plus className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                      {movementType === "masuk" ? "Tambah Stok" : "Kurangi Stok"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
