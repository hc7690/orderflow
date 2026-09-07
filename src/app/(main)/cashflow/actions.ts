"use server";

/**
 * OrderFlow — Cashflow Server Actions
 *
 * Server actions untuk laporan arus kas.
 */

import { queryMany, queryOne } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";

// ─── Tipe Data ─────────────────────────────────────────────────
export interface CashflowEntry {
  id: string;
  type: "pemasukan" | "pengeluaran";
  amount: number;
  description: string;
  transaction_date: string;
  reference_type: string | null;
}

export interface CashflowSummary {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
}

export interface DailyCashflow {
  date: string;
  pemasukan: number;
  pengeluaran: number;
}

export interface MonthlyCashflow {
  month: string;
  pemasukan: number;
  pengeluaran: number;
}

// ─── Get Cashflow Summary ──────────────────────────────────────
export async function getCashflowSummary(): Promise<CashflowSummary> {
  const orgId = await getOrganizationId();

  const pemasukan = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pemasukan'",
    [orgId]
  );

  const pengeluaran = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pengeluaran'",
    [orgId]
  );

  return {
    totalPemasukan: pemasukan?.total ?? 0,
    totalPengeluaran: pengeluaran?.total ?? 0,
    saldo: (pemasukan?.total ?? 0) - (pengeluaran?.total ?? 0),
  };
}

// ─── Get Recent Transactions ───────────────────────────────────
export async function getRecentTransactions(
  limit: number = 10
): Promise<CashflowEntry[]> {
  const orgId = await getOrganizationId();

  return queryMany<CashflowEntry>(
    `SELECT id, type, amount, description, transaction_date, reference_type
     FROM transactions
     WHERE organization_id = ?
     ORDER BY transaction_date DESC, created_at DESC
     LIMIT ${Math.min(Math.max(limit, 1), 100)}`,
    [orgId]
  );
}

// ─── Get Daily Cashflow (last 30 days) ─────────────────────────
export async function getDailyCashflow(): Promise<DailyCashflow[]> {
  const orgId = await getOrganizationId();

  const rows = await queryMany<{ date: string; pemasukan: number; pengeluaran: number }>(
    `SELECT 
       transaction_date as date,
       SUM(CASE WHEN type = 'pemasukan' THEN amount ELSE 0 END) as pemasukan,
       SUM(CASE WHEN type = 'pengeluaran' THEN amount ELSE 0 END) as pengeluaran
     FROM transactions
     WHERE organization_id = ? 
       AND transaction_date >= date('now', '-30 days')
     GROUP BY transaction_date
     ORDER BY transaction_date DESC`,
    [orgId]
  );

  return rows.map((r) => ({
    date: r.date,
    pemasukan: r.pemasukan,
    pengeluaran: r.pengeluaran,
  }));
}

// ─── Get Monthly Cashflow (last 12 months) ─────────────────────
export async function getMonthlyCashflow(): Promise<MonthlyCashflow[]> {
  const orgId = await getOrganizationId();

  return queryMany<MonthlyCashflow>(
    `SELECT 
       strftime('%Y-%m', transaction_date) as month,
       SUM(CASE WHEN type = 'pemasukan' THEN amount ELSE 0 END) as pemasukan,
       SUM(CASE WHEN type = 'pengeluaran' THEN amount ELSE 0 END) as pengeluaran
     FROM transactions
     WHERE organization_id = ?
       AND transaction_date >= date('now', '-12 months')
     GROUP BY strftime('%Y-%m', transaction_date)
     ORDER BY month DESC`,
    [orgId]
  );
}

// ─── Get Transaction Type Breakdown ────────────────────────────
export async function getTypeBreakdown() {
  const orgId = await getOrganizationId();

  const pemasukan = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pemasukan'",
    [orgId]
  );

  const pengeluaran = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pengeluaran'",
    [orgId]
  );

  return {
    pemasukan: pemasukan?.total ?? 0,
    pengeluaran: pengeluaran?.total ?? 0,
  };
}
