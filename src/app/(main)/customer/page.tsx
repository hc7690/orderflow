"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { formatTanggal } from "@/lib/utils";
import ActionDropdown from "@/components/ui/ActionDropdown";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  type Customer,
  type CreateCustomerInput,
} from "./actions";

// ─── Tipe Data ─────────────────────────────────────────────────
type FormData = CreateCustomerInput;

const initialFormData: FormData = {
  code: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

// ─── Komponen Utama ────────────────────────────────────────────
export default function CustomerPage() {
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ─── Fetch Customers ──────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCustomers(search || undefined);
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ─── Auto-generate code ──────────────────────────────────────
  useEffect(() => {
    if (showDialog && !editingCustomer) {
      const nextCode = `C${String(customers.length + 1).padStart(4, "0")}`;
      setFormData((prev) => ({ ...prev, code: nextCode }));
    }
  }, [showDialog, editingCustomer, customers.length]);

  // ─── Show success message ────────────────────────────────────
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ─── Open Add Dialog ──────────────────────────────────────────
  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setFormError(null);
    setShowDialog(true);
  };

  // ─── Open Edit Dialog ─────────────────────────────────────────
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
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
      if (editingCustomer) {
        await updateCustomer({ ...formData, id: editingCustomer.id });
        showSuccess("Customer berhasil diperbarui");
      } else {
        await createCustomer(formData);
        showSuccess("Customer berhasil ditambahkan");
      }
      setShowDialog(false);
      fetchCustomers();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Terjadi kesalahan"
      );
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Delete Customer ──────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);

    try {
      await deleteCustomer(deleteConfirm.id);
      showSuccess("Customer berhasil dihapus");
      setDeleteConfirm(null);
      fetchCustomers();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Gagal menghapus customer"
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

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data customer, informasi kontak, dan riwayat transaksi.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Customer
        </button>
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
          placeholder="Cari customer..."
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
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              {search ? "Tidak ada customer ditemukan" : "Belum ada customer"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search
                ? "Coba kata kunci lain"
                : "Tambahkan customer pertama Anda"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Kode</th>
                  <th className="px-5 py-3 font-medium">Nama</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">
                    Email
                  </th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">
                    Telepon
                  </th>
                  <th className="px-5 py-3 font-medium hidden lg:table-cell">
                    Dibuat
                  </th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-slate-600">
                      {customer.code}
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-slate-800">
                          {customer.name}
                        </p>
                        {customer.address && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {customer.address}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 hidden sm:table-cell">
                      {customer.email || "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 hidden md:table-cell">
                      {customer.phone || "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-500 hidden lg:table-cell">
                      {formatTanggal(customer.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ActionDropdown
                        isOpen={openMenuId === customer.id}
                        onToggle={() =>
                          setOpenMenuId(
                            openMenuId === customer.id ? null : customer.id
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
                          onClick={() => handleEdit(customer)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirm(customer);
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
                ))}
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
                {editingCustomer ? "Edit Customer" : "Tambah Customer"}
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
                  Kode Customer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="C0001"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                  disabled={formLoading}
                />
              </div>

              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nama customer"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                  disabled={formLoading}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@domain.com"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={formLoading}
                />
              </div>

              {/* Telepon */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Telepon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="08123456789"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={formLoading}
                />
              </div>

              {/* Alamat */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Alamat
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Alamat lengkap"
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  disabled={formLoading}
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Catatan tambahan"
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
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
              Hapus Customer?
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
