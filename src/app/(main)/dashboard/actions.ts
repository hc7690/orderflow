"use server";

/**
 * OrderFlow — Dashboard Server Actions
 *
 * Server actions untuk data dashboard.
 */

import { queryMany, queryOne } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";

// ─── Dashboard Stats ───────────────────────────────────────────
export interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  ordersToday: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  cashBalance: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const orgId = await getOrganizationId();

  const totalCustomers = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM customers WHERE organization_id = ?",
    [orgId]
  );

  const totalProducts = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND is_active = 1",
    [orgId]
  );

  const ordersToday = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM orders WHERE organization_id = ? AND order_date = date('now')",
    [orgId]
  );

  const monthlyRevenue = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pemasukan' AND transaction_date >= date('now', 'start of month')",
    [orgId]
  );

  const monthlyExpense = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pengeluaran' AND transaction_date >= date('now', 'start of month')",
    [orgId]
  );

  const pemasukan = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pemasukan'",
    [orgId]
  );

  const pengeluaran = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pengeluaran'",
    [orgId]
  );

  return {
    totalCustomers: totalCustomers?.count ?? 0,
    totalProducts: totalProducts?.count ?? 0,
    ordersToday: ordersToday?.count ?? 0,
    monthlyRevenue: monthlyRevenue?.total ?? 0,
    monthlyExpense: monthlyExpense?.total ?? 0,
    cashBalance: (pemasukan?.total ?? 0) - (pengeluaran?.total ?? 0),
  };
}

// ─── Recent Transactions ───────────────────────────────────────
export interface RecentTransaction {
  id: string;
  code: string;
  customer_name: string;
  total_amount: number;
  status: string;
  order_date: string;
}

export async function getRecentOrders(): Promise<RecentTransaction[]> {
  const orgId = await getOrganizationId();

  return queryMany<RecentTransaction>(
    `SELECT o.id, o.code, c.name as customer_name, o.total_amount, o.status, o.order_date
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     WHERE o.organization_id = ?
     ORDER BY o.created_at DESC
     LIMIT 5`,
    [orgId]
  );
}
