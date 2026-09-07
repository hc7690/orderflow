"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import { formatRupiah, formatTanggal, formatTanggalSingkat } from "@/lib/utils";
import {
  getCashflowSummary,
  getRecentTransactions,
  getDailyCashflow,
  getMonthlyCashflow,
  type CashflowSummary,
  type CashflowEntry,
  type DailyCashflow,
  type MonthlyCashflow,
} from "./actions";

export default function CashflowPage() {
  const [summary, setSummary] = useState<CashflowSummary>({ totalPemasukan: 0, totalPengeluaran: 0, saldo: 0 });
  const [recentTransactions, setRecentTransactions] = useState<CashflowEntry[]>([]);
  const [dailyData, setDailyData] = useState<DailyCashflow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyCashflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [s, r, d, m] = await Promise.all([
        getCashflowSummary(),
        getRecentTransactions(15),
        getDailyCashflow(),
        getMonthlyCashflow(),
      ]);
      setSummary(s);
      setRecentTransactions(r);
      setDailyData(d);
      setMonthlyData(m);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatMonth = (month: string) => {
    const [year, m] = month.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${months[parseInt(m, 10) - 1]} ${year}`;
  };

  const maxDaily = Math.max(...dailyData.map((d) => Math.max(d.pemasukan, d.pengeluaran)), 1);
  const maxMonthly = Math.max(...monthlyData.map((m) => Math.max(m.pemasukan, m.pengeluaran)), 1);

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
        <h1 className="text-2xl font-bold text-slate-900">Cashflow</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pantau arus kas masuk dan keluar, saldo, serta proyeksi keuangan usaha.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Pemasukan</p>
              <p className="text-2xl font-bold text-green-600">{formatRupiah(summary.totalPemasukan)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-red-600">{formatRupiah(summary.totalPengeluaran)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${summary.saldo >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
              <Wallet className={`w-6 h-6 ${summary.saldo >= 0 ? "text-blue-500" : "text-amber-500"}`} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Saldo Bersih</p>
              <p className={`text-2xl font-bold ${summary.saldo >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                {summary.saldo >= 0 ? "+" : ""}{formatRupiah(summary.saldo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Grafik Arus Kas</h2>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button onClick={() => setActiveTab("daily")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "daily" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
              <Calendar className="w-3.5 h-3.5 inline mr-1" />Harian
            </button>
            <button onClick={() => setActiveTab("monthly")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
              <Calendar className="w-3.5 h-3.5 inline mr-1" />Bulanan
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded bg-green-400" />Pemasukan
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded bg-red-400" />Pengeluaran
          </div>
        </div>

        {/* Bar Chart */}
        {activeTab === "daily" ? (
          dailyData.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">Belum ada data harian</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {dailyData.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-slate-500 shrink-0">{formatTanggalSingkat(day.date)}</div>
                  <div className="flex-1 space-y-1">
                    {day.pemasukan > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-4 bg-green-400 rounded" style={{ width: `${(day.pemasukan / maxDaily) * 100}%`, minWidth: "4px" }} />
                        <span className="text-xs text-green-600 whitespace-nowrap">{formatRupiah(day.pemasukan)}</span>
                      </div>
                    )}
                    {day.pengeluaran > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-4 bg-red-400 rounded" style={{ width: `${(day.pengeluaran / maxDaily) * 100}%`, minWidth: "4px" }} />
                        <span className="text-xs text-red-600 whitespace-nowrap">{formatRupiah(day.pengeluaran)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : monthlyData.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">Belum ada data bulanan</div>
        ) : (
          <div className="space-y-3">
            {monthlyData.map((month) => (
              <div key={month.month} className="flex items-center gap-3">
                <div className="w-20 text-xs text-slate-500 shrink-0">{formatMonth(month.month)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-5 bg-green-400 rounded" style={{ width: `${(month.pemasukan / maxMonthly) * 100}%`, minWidth: "4px" }} />
                    <span className="text-xs text-green-600 whitespace-nowrap">{formatRupiah(month.pemasukan)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 bg-red-400 rounded" style={{ width: `${(month.pengeluaran / maxMonthly) * 100}%`, minWidth: "4px" }} />
                    <span className="text-xs text-red-600 whitespace-nowrap">{formatRupiah(month.pengeluaran)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Transaksi Terakhir</h2>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">Belum ada transaksi</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "pemasukan" ? "bg-green-50" : "bg-red-50"}`}>
                    {tx.type === "pemasukan" ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{tx.description}</p>
                    <p className="text-xs text-slate-400">{formatTanggalSingkat(tx.transaction_date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.type === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                  {tx.type === "pemasukan" ? "+" : "-"}{formatRupiah(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
