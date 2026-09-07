"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  ShoppingCart,
  Eye,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  Package,
  Minus,
  DollarSign,
} from "lucide-react";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import ActionDropdown from "@/components/ui/ActionDropdown";
import {
  getOrders,
  getOrder,
  getOrderItems,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
  getOrderPaymentSummary,
  recordPayment,
  deleteOrderPayment,
  type Order,
  type OrderItem,
  type OrderPaymentSummary,
  type OrderPayment,
} from "./actions";
import { PAYMENT_METHODS } from "@/lib/utils";
import { getCustomers, type Customer } from "../customer/actions";
import { getActiveProducts, type Product } from "../produk/actions";
import { notifyRefresh } from "@/lib/notifications-refresh";

// ─── Tipe Data ─────────────────────────────────────────────────
interface OrderItemForm {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "dikonfirmasi", label: "Dikonfirmasi", color: "bg-blue-100 text-blue-700" },
  { value: "diproses", label: "Diproses", color: "bg-amber-100 text-amber-700" },
  { value: "selesai", label: "Selesai", color: "bg-green-100 text-green-700" },
  { value: "dibatalkan", label: "Dibatalkan", color: "bg-red-100 text-red-700" },
];

// ─── Komponen Utama ────────────────────────────────────────────
export default function OrderPage() {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, inProgress: 0, completed: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showDetail, setShowDetail] = useState<Order | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<OrderPaymentSummary | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_method: "", description: "", payment_date: new Date().toISOString().split("T")[0] });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [deletePaymentConfirm, setDeletePaymentConfirm] = useState<OrderPayment | null>(null);
  const [deletePaymentLoading, setDeletePaymentLoading] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersData, statsData] = await Promise.all([
        getOrders(search || undefined, statusFilter || undefined),
        getOrderStats(),
      ]);
      setOrders(ordersData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Fetch form data when dialog opens ───────────────────────
  useEffect(() => {
    if (showDialog) {
      Promise.all([getCustomers(), getActiveProducts()]).then(([c, p]) => {
        setCustomers(c);
        setProducts(p);
      });
    }
  }, [showDialog]);

  // ─── Show success message ────────────────────────────────────
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ─── Open Add Dialog ──────────────────────────────────────────
  const handleAdd = () => {
    setSelectedCustomer(null);
    setOrderItems([]);
    setDiscount(0);
    setNotes("");
    setFormError(null);
    setShowDialog(true);
  };

  // ─── View Order Detail ───────────────────────────────────────
  const handleViewDetail = async (order: Order) => {
    setDetailLoading(true);
    setShowDetail(order);
    setPaymentSummary(null);
    try {
      const [items, summary] = await Promise.all([
        getOrderItems(order.id),
        getOrderPaymentSummary(order.id),
      ]);
      setDetailItems(items);
      setPaymentSummary(summary);
    } catch (error) {
      console.error("Error fetching order detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Delete Payment ─────────────────────────────────────────
  const handleDeletePayment = async () => {
    if (!deletePaymentConfirm) return;
    setDeletePaymentLoading(true);
    try {
      const updated = await deleteOrderPayment(deletePaymentConfirm.id);
      setPaymentSummary(updated);
      setDeletePaymentConfirm(null);
      showSuccess("Pembayaran berhasil dihapus");
      notifyRefresh();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Gagal menghapus pembayaran");
    } finally {
      setDeletePaymentLoading(false);
    }
  };

  // ─── Record Payment ─────────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!showDetail) return;
    setPaymentError(null);
    setPaymentLoading(true);
    try {
      const updated = await recordPayment({
        order_id: showDetail.id,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method || undefined,
        description: paymentForm.description || undefined,
        payment_date: paymentForm.payment_date,
      });
      setPaymentSummary(updated);
      setPaymentForm({ amount: 0, payment_method: "", description: "", payment_date: new Date().toISOString().split("T")[0] });
      setShowPaymentDialog(false);
      showSuccess("Pembayaran berhasil dicatat");
      notifyRefresh();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Gagal mencatat pembayaran");
    } finally {
      setPaymentLoading(false);
    }
  };

  // ─── Add Item ────────────────────────────────────────────────
  const handleAddItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product_id: "",
        product_code: "",
        product_name: "",
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  // ─── Update Item ─────────────────────────────────────────────
  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...orderItems];
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          unit_price: product.selling_price,
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setOrderItems(newItems);
  };

  // ─── Remove Item ─────────────────────────────────────────────
  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // ─── Calculate Total ─────────────────────────────────────────
  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    return subtotal - discount;
  };

  // ─── Submit Order ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setFormError("Pilih customer terlebih dahulu");
      return;
    }
    if (orderItems.length === 0) {
      setFormError("Tambahkan minimal 1 item");
      return;
    }
    if (orderItems.some((item) => !item.product_id || item.quantity <= 0)) {
      setFormError("Pastikan semua item valid");
      return;
    }

    setFormError(null);
    setFormLoading(true);

    try {
      await createOrder({
        customer_id: selectedCustomer.id,
        discount,
        notes: notes || undefined,
        items: orderItems.map((item) => ({
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });
      showSuccess("Order berhasil dibuat");
      setShowDialog(false);
      fetchData();
      notifyRefresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Update Status ──────────────────────────────────────────
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setStatusLoading(orderId);
    setFormError(null);

    try {
      await updateOrderStatus(orderId, newStatus as Order["status"]);
      showSuccess("Status order berhasil diperbarui");

      // Update status di Detail Order secara langsung
      setShowDetail((prev) =>
        prev ? { ...prev, status: newStatus as Order["status"] } : prev
      );

      setStatusDropdown(null);
      await fetchData();
      notifyRefresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal memperbarui status");
    } finally {
      setStatusLoading(null);
    }
  };

  // ─── Delete Order ────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await deleteOrder(deleteConfirm.id);
      showSuccess("Order berhasil dihapus");
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menghapus order");
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Get available statuses (all except current) ────────────
  const getAvailableStatuses = (currentStatus: string): string[] => {
    // Terminal states cannot be changed
    if (currentStatus === "selesai" || currentStatus === "dibatalkan") {
      return [];
    }
    // Return all statuses except the current one
    return STATUS_OPTIONS.map((s) => s.value).filter((s) => s !== currentStatus);
  };

  // ─── Close dialog on Escape ──────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDialog(false);
      setShowDetail(null);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Masuk</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola pesanan masuk dari customer, proses order, dan lacak status pengiriman.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Order</p>
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
          <p className="text-sm text-slate-500">Selesai</p>
          <p className="text-xl font-bold text-slate-900">{stats.completed}</p>
        </div>
      </div>

      {/* Success/Error */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          {successMessage}
        </div>
      )}
      {formError && !showDialog && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {formError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <ShoppingCart className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              {search || statusFilter ? "Tidak ada order ditemukan" : "Belum ada order"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Kode</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Tanggal</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusOpt = STATUS_OPTIONS.find((s) => s.value === order.status);
                  const availableStatuses = getAvailableStatuses(order.status);

                  return (
                    <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-600">{order.code}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{order.customer_name}</p>
                        <p className="text-xs text-slate-400">{order.customer_code}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">
                        {formatTanggal(order.order_date)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800">
                        {formatRupiah(order.total_amount)}
                      </td>
                      <td className="px-5 py-3">
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
              order.status === "selesai"
                ? "bg-green-100 text-green-700"
                : order.status === "dibatalkan"
                ? "bg-red-100 text-red-700"
                : order.status === "diproses"
                ? "bg-blue-100 text-blue-700"
                : order.status === "dikirim"
                ? "bg-purple-100 text-purple-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {STATUS_OPTIONS.find((s) => s.value === order.status)?.label}
          </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewDetail(order)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.status === "draft" && (
                            <button
                              onClick={() => setDeleteConfirm(order)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* Create Order Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-900">Buat Order Baru</h2>
              <button onClick={() => setShowDialog(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const c = customers.find((c) => c.id === e.target.value);
                    setSelectedCustomer(c || null);
                  }}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={formLoading}
                  required
                >
                  <option value="">Pilih Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Item Order <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Item
                  </button>
                </div>

                {orderItems.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Klik &quot;Tambah Item&quot; untuk menambahkan produk
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <select
                              value={item.product_id}
                              onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              disabled={formLoading}
                              required
                            >
                              <option value="">Pilih Produk</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} — {p.name} (Stok: {p.current_stock})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              value={item.quantity || ""}
                              onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                              min="1"
                              placeholder="Qty"
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              disabled={formLoading}
                              required
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={item.unit_price || ""}
                              onChange={(e) => handleItemChange(index, "unit_price", Number(e.target.value))}
                              min="0"
                              placeholder="Harga"
                              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              disabled={formLoading}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              disabled={formLoading}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {item.product_id && (
                          <div className="text-sm font-medium text-slate-600 whitespace-nowrap pt-2">
                            {formatRupiah(item.quantity * item.unit_price)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discount & Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Diskon</label>
                  <input
                    type="number"
                    value={discount || ""}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    disabled={formLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan (opsional)"
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    disabled={formLoading}
                  />
                </div>
              </div>

              {/* Total */}
              {orderItems.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-600">Total</span>
                  <span className="text-lg font-bold text-slate-900">{formatRupiah(calculateTotal())}</span>
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
                  disabled={formLoading || orderItems.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Order"
                  )}
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
              <h2 className="text-lg font-semibold text-slate-900">Detail Order</h2>
              <button onClick={() => setShowDetail(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Kode</p>
                  <p className="font-mono font-medium text-slate-800">{showDetail.code}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
        <div className="flex items-center gap-2">
              <select
                value={showDetail.status}
                onChange={(e) => handleUpdateStatus(showDetail.id, e.target.value)}
                disabled={statusLoading === showDetail.id}
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-70 disabled:cursor-wait ${
                  STATUS_OPTIONS.find((s) => s.value === showDetail.status)?.color
                }`}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
          {statusLoading === showDetail.id && (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          )}
        </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="font-medium text-slate-800">{showDetail.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tanggal</p>
                  <p className="text-slate-800">{formatTanggal(showDetail.order_date)}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Item Order</p>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 bg-slate-50">
                          <th className="px-4 py-2 font-medium">Produk</th>
                          <th className="px-4 py-2 font-medium text-right">Qty</th>
                          <th className="px-4 py-2 font-medium text-right">Harga</th>
                          <th className="px-4 py-2 font-medium text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailItems.map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-4 py-2">
                              <p className="font-medium text-slate-800">{item.product_name}</p>
                              <p className="text-xs text-slate-400 font-mono">{item.product_code}</p>
                            </td>
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

              {/* Totals */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                {showDetail.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Diskon</span>
                    <span className="text-red-600">-{formatRupiah(showDetail.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium text-slate-700">Total</span>
                  <span className="text-lg font-bold text-slate-900">{formatRupiah(showDetail.total_amount)}</span>
                </div>
              </div>

              {/* Payment Info */}
              {paymentSummary && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-slate-700 mb-2">Pembayaran</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Dibayar</span>
                    <span className="font-medium text-green-600">{formatRupiah(paymentSummary.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Sisa Pembayaran</span>
                    <span className={`font-medium ${paymentSummary.remaining > 0 ? "text-amber-600" : "text-green-600"}`}>{formatRupiah(paymentSummary.remaining)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Status Pembayaran</span>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${paymentSummary.paymentStatus === "lunas" ? "bg-green-100 text-green-700" : paymentSummary.paymentStatus === "dp" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                      {paymentSummary.paymentStatus === "lunas" ? "Lunas" : paymentSummary.paymentStatus === "dp" ? "DP" : "Belum Bayar"}
                    </span>
                  </div>
                  {paymentSummary.payments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Riwayat Pembayaran</p>
                      <div className="space-y-1.5">
                        {paymentSummary.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-xs gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-slate-500">{formatTanggal(p.payment_date)} {p.description && `— ${p.description}`}</span>
                            </div>
                            <span className="font-medium text-slate-700 whitespace-nowrap">{formatRupiah(p.amount)}</span>
                            <button
                              onClick={() => setDeletePaymentConfirm(p)}
                              className="shrink-0 p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                              title="Hapus pembayaran"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showDetail.status !== "dibatalkan" && paymentSummary.remaining > 0 && (
                    <button
                      onClick={() => {
                        setPaymentForm({ amount: paymentSummary.remaining, payment_method: "", description: "", payment_date: new Date().toISOString().split("T")[0] });
                        setPaymentError(null);
                        setShowPaymentDialog(true);
                      }}
                      className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <DollarSign className="w-4 h-4" />
                      Catat Pembayaran
                    </button>
                  )}
                </div>
              )}

              {showDetail.notes && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Catatan</p>
                  <p className="text-sm text-slate-700">{showDetail.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      {showPaymentDialog && showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !paymentLoading && setShowPaymentDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Catat Pembayaran</h2>
              <button onClick={() => setShowPaymentDialog(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {paymentError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4 shrink-0" />{paymentError}</div>
              )}
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="text-slate-500">Order: <span className="font-medium text-slate-700">{showDetail.code}</span></p>
                <p className="text-slate-500">Sisa: <span className="font-bold text-amber-600">{formatRupiah(paymentSummary?.remaining ?? 0)}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah <span className="text-red-500">*</span></label>
                <input type="number" value={paymentForm.amount || ""} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} min="1" max={paymentSummary?.remaining ?? 0} required disabled={paymentLoading}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Metode Pembayaran</label>
                <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} disabled={paymentLoading}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="">Pilih metode</option>
                  {PAYMENT_METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
                <input type="text" value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="Catatan (opsional)" disabled={paymentLoading}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal</label>
                <input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} disabled={paymentLoading}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentDialog(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" disabled={paymentLoading}>Batal</button>
                <button type="button" onClick={handleRecordPayment} disabled={paymentLoading || paymentForm.amount <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                  {paymentLoading ? (<><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>) : (<>Simpan</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Payment Confirmation */}
      {deletePaymentConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deletePaymentLoading && setDeletePaymentConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 text-center">Hapus Pembayaran?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              Hapus pembayaran sebesar <span className="font-medium text-slate-700">{formatRupiah(deletePaymentConfirm.amount)}</span> pada {formatTanggal(deletePaymentConfirm.payment_date)}? Transaksi pemasukan terkait juga akan dihapus dari Cashflow.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setDeletePaymentConfirm(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" disabled={deletePaymentLoading}>Batal</button>
              <button onClick={handleDeletePayment} disabled={deletePaymentLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {deletePaymentLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</>) : ("Hapus")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleteLoading && setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 text-center">Hapus Order?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              Anda yakin ingin menghapus order{" "}
              <span className="font-medium text-slate-700">{deleteConfirm.code}</span>?
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
                  <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</>
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
