"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { formatRupiah, formatTanggalSingkat } from "@/lib/utils";
import { getDashboardStats, getRecentOrders, type DashboardStats, type RecentTransaction } from "./actions";

const statusColor: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  dikonfirmasi: "bg-blue-100 text-blue-700",
  diproses: "bg-amber-100 text-amber-700",
  selesai: "bg-green-100 text-green-700",
  dibatalkan: "bg-red-100 text-red-700",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  dikonfirmasi: "Dikonfirmasi",
  diproses: "Diproses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, ordersData] = await Promise.all([
        getDashboardStats(),
        getRecentOrders(),
      ]);
      setStats(statsData);
      setRecentOrders(ordersData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Customer",
      value: stats?.totalCustomers ?? 0,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      iconColor: "text-blue-500",
    },
    {
      label: "Total Produk",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: "bg-purple-50 text-purple-600",
      iconColor: "text-purple-500",
    },
    {
      label: "Order Hari Ini",
      value: stats?.ordersToday ?? 0,
      icon: ShoppingCart,
      color: "bg-emerald-50 text-emerald-600",
      iconColor: "text-emerald-500",
    },
    {
      label: "Pendapatan Bulan Ini",
      value: formatRupiah(stats?.monthlyRevenue ?? 0),
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
      iconColor: "text-green-500",
    },
    {
      label: "Pengeluaran Bulan Ini",
      value: formatRupiah(stats?.monthlyExpense ?? 0),
      icon: TrendingDown,
      color: "bg-red-50 text-red-600",
      iconColor: "text-red-500",
    },
    {
      label: "Saldo Kas",
      value: formatRupiah(stats?.cashBalance ?? 0),
      icon: CreditCard,
      color: "bg-amber-50 text-amber-600",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Selamat datang kembali! Berikut ringkasan usaha Anda hari ini.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {card.value}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}
              >
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Order Terakhir
          </h2>
          <Link
            href="/order"
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium"
          >
            Lihat Semua <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Belum ada order
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Kode</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-slate-600">
                      {order.code}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {order.customer_name}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatTanggalSingkat(order.order_date)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">
                      {formatRupiah(order.total_amount)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColor[order.status] ??
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusLabel[order.status] ?? order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
