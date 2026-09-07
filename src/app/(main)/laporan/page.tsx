"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Loader2,
  DollarSign,
} from "lucide-react";
import { formatRupiah, formatAngka, EXPENSE_CATEGORIES } from "@/lib/utils";
import {
  getProfitLossReport,
  getSalesReport,
  getInventoryValue,
  getTopCustomers,
  getTopProducts,
  type ProfitLossReport,
  type SalesReport,
  type ProductReport,
  type TopCustomer,
  type TopProduct,
} from "./actions";

export default function LaporanPage() {
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport>({ totalRevenue: 0, totalCOGS: 0, labaKotor: 0, totalBiayaPengeluaran: 0, expensesByCategory: [], labaBersih: 0, hasCOGSData: false });
  const [sales, setSales] = useState<SalesReport>({ totalOrders: 0, totalRevenue: 0, averageOrder: 0 });
  const [inventory, setInventory] = useState<ProductReport[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ringkasan" | "stok" | "customer" | "produk">("ringkasan");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pl, s, inv, tc, tp] = await Promise.all([
        getProfitLossReport(),
        getSalesReport(),
        getInventoryValue(),
        getTopCustomers(10),
        getTopProducts(10),
      ]);
      setProfitLoss(pl);
      setSales(s);
      setInventory(inv);
      setTopCustomers(tc);
      setTopProducts(tp);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalInventoryValue = inventory.reduce((sum, p) => sum + p.stock_value, 0);

  const maxCustomerRevenue = Math.max(...topCustomers.map((c) => c.total_amount), 1);
  const maxProductRevenue = Math.max(...topProducts.map((p) => p.total_revenue), 1);

  const tabs = [
    { key: "ringkasan", label: "Ringkasan", icon: BarChart3 },
    { key: "stok", label: "Nilai Stok", icon: Package },
    { key: "customer", label: "Top Customer", icon: Users },
    { key: "produk", label: "Top Produk", icon: TrendingUp },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laporan Keuangan</h1>
        <p className="text-sm text-slate-500 mt-1">Buat dan lihat laporan laba rugi, neraca, dan laporan keuangan lainnya.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Ringkasan Tab */}
      {activeTab === "ringkasan" && (
        <div className="space-y-6">
          {/* Profit/Loss */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Pendapatan (Revenue) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center"><TrendingUp className="w-6 h-6 text-green-500" /></div>
                <div>
                  <p className="text-sm text-slate-500">Total Pendapatan</p>
                  <p className="text-2xl font-bold text-green-600">{formatRupiah(profitLoss.totalRevenue)}</p>
                  <p className="text-xs text-slate-400">Dari order selesai</p>
                </div>
              </div>
            </div>
            {/* Total HPP */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center"><Package className="w-6 h-6 text-amber-500" /></div>
                <div>
                  <p className="text-sm text-slate-500">Total HPP / Modal</p>
                  <p className="text-2xl font-bold text-amber-600">{formatRupiah(profitLoss.totalCOGS)}</p>
                  <p className="text-xs text-slate-400">Harga modal produk terjual</p>
                </div>
              </div>
            </div>
            {/* Laba Bersih */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${profitLoss.labaBersih >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
                  <DollarSign className={`w-6 h-6 ${profitLoss.labaBersih >= 0 ? "text-blue-500" : "text-amber-500"}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Laba Bersih</p>
                  <p className={`text-2xl font-bold ${profitLoss.labaBersih >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                    {profitLoss.labaBersih >= 0 ? "+" : ""}{formatRupiah(profitLoss.labaBersih)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profit/Loss Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Rincian Laba / Rugi</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Total Pendapatan (Order Selesai)</span>
                <span className="text-sm font-semibold text-green-600">{formatRupiah(profitLoss.totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Total HPP / Modal Produk Terjual</span>
                <span className="text-sm font-semibold text-red-600">-{formatRupiah(profitLoss.totalCOGS)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-800">Laba Kotor</span>
                <span className={`text-sm font-bold ${profitLoss.labaKotor >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {profitLoss.labaKotor >= 0 ? "+" : ""}{formatRupiah(profitLoss.labaKotor)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Total Biaya Pengeluaran</span>
                <span className="text-sm font-semibold text-red-600">-{formatRupiah(profitLoss.totalBiayaPengeluaran)}</span>
              </div>
              {/* Rincian per kategori */}
              {profitLoss.expensesByCategory.length > 0 && (
                <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1.5">
                  {profitLoss.expensesByCategory.map((exp) => {
                    const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label || exp.category;
                    return (
                      <div key={exp.category} className="flex items-center justify-between py-1">
                        <span className="text-xs text-slate-500">{catLabel}</span>
                        <span className="text-xs font-medium text-slate-600">{formatRupiah(exp.total)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between py-3">
                <span className="text-base font-bold text-slate-900">Laba Bersih</span>
                <span className={`text-xl font-bold ${profitLoss.labaBersih >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                  {profitLoss.labaBersih >= 0 ? "+" : ""}{formatRupiah(profitLoss.labaBersih)}
                </span>
              </div>
            </div>
            {!profitLoss.hasCOGSData && profitLoss.totalRevenue > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  ⚠️ Data HPP/Modal belum tersedia untuk semua produk. Laba kotor dihitung berdasarkan data yang ada. Untuk perhitungan akurat, pastikan harga modal (harga beli) sudah diisi di halaman Produk.
                </p>
              </div>
            )}
          </div>

          {/* Sales */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Penjualan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-500">Total Order Selesai</p>
                <p className="text-xl font-bold text-slate-900">{formatAngka(sales.totalOrders)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Pendapatan</p>
                <p className="text-xl font-bold text-slate-900">{formatRupiah(sales.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Rata-rata per Order</p>
                <p className="text-xl font-bold text-slate-900">{formatRupiah(sales.averageOrder)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stok Tab */}
      {activeTab === "stok" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Total Nilai Inventori</p>
            <p className="text-2xl font-bold text-slate-900">{formatRupiah(totalInventoryValue)}</p>
            <p className="text-xs text-slate-400 mt-1">{inventory.length} produk dengan stok</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Kode</th>
                    <th className="px-5 py-3 font-medium">Nama</th>
                    <th className="px-5 py-3 font-medium text-right">Stok</th>
                    <th className="px-5 py-3 font-medium text-right">Harga Beli</th>
                    <th className="px-5 py-3 font-medium text-right">Harga Jual</th>
                    <th className="px-5 py-3 font-medium text-right">Nilai Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((p) => (
                    <tr key={p.code} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-slate-600">{p.code}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                      <td className="px-5 py-3 text-right">{p.current_stock}</td>
                      <td className="px-5 py-3 text-right">{formatRupiah(p.cost_price)}</td>
                      <td className="px-5 py-3 text-right">{formatRupiah(p.selling_price)}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800">{formatRupiah(p.stock_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Tab */}
      {activeTab === "customer" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Customer</h3>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c) => (
                <div key={c.customer_code} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-slate-500 shrink-0">
                    <p className="font-medium text-slate-700">{c.customer_name}</p>
                    <p className="font-mono text-slate-400">{c.customer_code}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-5 bg-blue-400 rounded" style={{ width: `${(c.total_amount / maxCustomerRevenue) * 100}%`, minWidth: "4px" }} />
                  </div>
                  <div className="w-32 text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatRupiah(c.total_amount)}</p>
                    <p className="text-xs text-slate-400">{c.total_orders} order</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Produk Tab */}
      {activeTab === "produk" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Produk</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p) => (
                <div key={p.product_code} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-slate-500 shrink-0">
                    <p className="font-medium text-slate-700">{p.product_name}</p>
                    <p className="font-mono text-slate-400">{p.product_code}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-5 bg-green-400 rounded" style={{ width: `${(p.total_revenue / maxProductRevenue) * 100}%`, minWidth: "4px" }} />
                  </div>
                  <div className="w-32 text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatRupiah(p.total_revenue)}</p>
                    <p className="text-xs text-slate-400">{formatAngka(p.total_quantity)} terjual</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
