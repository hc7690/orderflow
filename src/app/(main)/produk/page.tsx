"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Boxes,
  AlertTriangle,
} from "lucide-react";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import ActionDropdown from "@/components/ui/ActionDropdown";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  type Product,
  type CreateProductInput,
} from "./actions";

// ─── Tipe Data ─────────────────────────────────────────────────
type FormData = CreateProductInput & { is_active?: number };

const initialFormData: FormData = {
  code: "",
  name: "",
  description: "",
  unit: "pcs",
  cost_price: 0,
  selling_price: 0,
  min_stock: 0,
};

const UNITS = ["pcs", "kg", "liter", "box", "pack", "meter", "lusin", "rim"];

// ─── Komponen Utama ────────────────────────────────────────────
export default function ProdukPage() {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ─── Fetch Products ───────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        getProducts(search || undefined),
        getProductStats(),
      ]);
      setProducts(data);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ─── Auto-generate code ──────────────────────────────────────
  useEffect(() => {
    if (showDialog && !editingProduct) {
      const nextCode = `P${String(products.length + 1).padStart(4, "0")}`;
      setFormData((prev) => ({ ...prev, code: nextCode }));
    }
  }, [showDialog, editingProduct, products.length]);

  // ─── Show success message ────────────────────────────────────
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ─── Open Add Dialog ──────────────────────────────────────────
  const handleAdd = () => {
    setEditingProduct(null);
    setFormData(initialFormData);
    setFormError(null);
    setShowDialog(true);
  };

  // ─── Open Edit Dialog ─────────────────────────────────────────
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || "",
      unit: product.unit,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      min_stock: product.min_stock,
      is_active: product.is_active,
    });
    setFormError(null);
    setShowDialog(true);
    setOpenMenuId(null);
  };

  // ─── Submit Form ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      if (editingProduct) {
        await updateProduct({ ...formData, id: editingProduct.id });
        showSuccess("Produk berhasil diperbarui");
      } else {
        await createProduct(formData);
        showSuccess("Produk berhasil ditambahkan");
      }
      setShowDialog(false);
      fetchProducts();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Terjadi kesalahan"
      );
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Delete Product ──────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);

    try {
      await deleteProduct(deleteConfirm.id);
      showSuccess("Produk berhasil dihapus");
      setDeleteConfirm(null);
      fetchProducts();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Gagal menghapus produk"
      );
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Close dialog on Escape ──────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDialog(false);
      setDeleteConfirm(null);
    }
  };

  // ─── Calculate profit margin ─────────────────────────────────
  const getMargin = (cost: number, selling: number) => {
    if (cost === 0) return selling > 0 ? 100 : 0;
    return Math.round(((selling - cost) / cost) * 100);
  };

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produk</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola daftar produk, harga, kategori, dan informasi produk lainnya.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Produk
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Produk</p>
              <p className="text-xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Aktif</p>
              <p className="text-xl font-bold text-slate-900">{stats.active}</p>
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
              <p className="text-xl font-bold text-slate-900">
                {stats.lowStock}
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              {search ? "Tidak ada produk ditemukan" : "Belum ada produk"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? "Coba kata kunci lain" : "Tambahkan produk pertama Anda"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Kode</th>
                  <th className="px-5 py-3 font-medium">Nama</th>
                  <th className="px-5 py-3 font-medium text-right">Harga Beli</th>
                  <th className="px-5 py-3 font-medium text-right">
                    Harga Jual
                  </th>
                  <th className="px-5 py-3 font-medium text-right">Margin</th>
                  <th className="px-5 py-3 font-medium text-right">Stok</th>
                  <th className="px-5 py-3 font-medium text-center">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const margin = getMargin(
                    product.cost_price,
                    product.selling_price
                  );
                  const isLowStock =
                    product.min_stock > 0 &&
                    product.current_stock <= product.min_stock;
                  const isActive = product.is_active === 1;

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
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatRupiah(product.cost_price)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800">
                        {formatRupiah(product.selling_price)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            margin >= 30
                              ? "bg-green-100 text-green-700"
                              : margin >= 10
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {margin}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`font-medium ${
                            isLowStock
                              ? "text-red-600"
                              : product.current_stock === 0
                                ? "text-slate-400"
                                : "text-slate-800"
                          }`}
                        >
                          {product.current_stock}
                        </span>
                        {isLowStock && (
                          <span className="ml-1 text-xs text-red-500">
                            (min: {product.min_stock})
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ActionDropdown
                          isOpen={openMenuId === product.id}
                          onToggle={() =>
                            setOpenMenuId(
                              openMenuId === product.id ? null : product.id
                            )
                          }
                          onClose={() => setOpenMenuId(null)}
                          trigger={
                            <button
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          }
                        >
                          <button
                            onClick={() => handleEdit(product)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm(product);
                              setOpenMenuId(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Hapus
                          </button>
                        </ActionDropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDialog(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingProduct ? "Edit Produk" : "Tambah Produk"}
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

              {/* Kode */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kode Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="P0001"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                  disabled={formLoading}
                />
              </div>

              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nama produk"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                  disabled={formLoading}
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Deskripsi produk"
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  disabled={formLoading}
                />
              </div>

              {/* Satuan */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Satuan
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={formLoading}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Harga */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Harga Beli <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost_price: Number(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    required
                    disabled={formLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Harga Jual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.selling_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        selling_price: Number(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    required
                    disabled={formLoading}
                  />
                </div>
              </div>

              {/* Stok Minimum */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Stok Minimum
                </label>
                <input
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_stock: Number(e.target.value),
                    })
                  }
                  min="0"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={formLoading}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Peringatan akan muncul jika stok di bawah angka ini
                </p>
              </div>

              {/* Status (only when editing) */}
              {editingProduct && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Status
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        value="1"
                        checked={formData.is_active === 1}
                        onChange={() =>
                          setFormData({ ...formData, is_active: 1 })
                        }
                        className="w-4 h-4 text-primary focus:ring-primary"
                        disabled={formLoading}
                      />
                      <span className="text-sm text-slate-700">Aktif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        value="0"
                        checked={formData.is_active === 0}
                        onChange={() =>
                          setFormData({ ...formData, is_active: 0 })
                        }
                        className="w-4 h-4 text-primary focus:ring-primary"
                        disabled={formLoading}
                      />
                      <span className="text-sm text-slate-700">Nonaktif</span>
                    </label>
                  </div>
                </div>
              )}

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
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleteLoading && setDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 text-center">
              Hapus Produk?
            </h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              Anda yakin ingin menghapus{" "}
              <span className="font-medium text-slate-700">
                {deleteConfirm.name}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={deleteLoading}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  "Hapus"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
