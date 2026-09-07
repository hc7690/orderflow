"use server";

/**
 * OrderFlow — Laporan Server Actions
 *
 * Server actions untuk laporan keuangan.
 */

import { queryMany, queryOne } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";

// ─── Tipe Data ─────────────────────────────────────────────────
export interface ExpenseByCategory {
  category: string;
  total: number;
}

export interface ProfitLossReport {
  totalRevenue: number;       // Total penjualan dari order selesai
  totalCOGS: number;          // Total HPP/modal produk terjual
  labaKotor: number;          // Revenue - COGS
  totalBiayaPengeluaran: number; // Total seluruh biaya pengeluaran
  expensesByCategory: ExpenseByCategory[]; // Rincian per kategori
  labaBersih: number;         // Laba Kotor - Total Biaya Pengeluaran
  hasCOGSData: boolean;       // Apakah data HPP tersedia
}

export interface SalesReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrder: number;
}

export interface ProductReport {
  code: string;
  name: string;
  current_stock: number;
  cost_price: number;
  selling_price: number;
  stock_value: number;
}

export interface TopCustomer {
  customer_name: string;
  customer_code: string;
  total_orders: number;
  total_amount: number;
}

export interface TopProduct {
  product_name: string;
  product_code: string;
  total_quantity: number;
  total_revenue: number;
}

// ─── Get Profit/Loss ───────────────────────────────────────────
export async function getProfitLossReport(): Promise<ProfitLossReport> {
  const orgId = await getOrganizationId();

  // 1. Total Pendapatan = SUM(total_amount) dari order selesai
  const revenueResult = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(o.total_amount), 0) as total
     FROM orders o
     WHERE o.organization_id = ? AND o.status = 'selesai'`,
    [orgId]
  );
  const totalRevenue = revenueResult?.total ?? 0;

  // 2. Total HPP = SUM(order_items.quantity × products.cost_price) dari order selesai
  const cogsResult = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(oi.quantity * p.cost_price), 0) as total
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN products p ON oi.product_id = p.id
     WHERE o.organization_id = ? AND o.status = 'selesai'`,
    [orgId]
  );
  const totalCOGS = cogsResult?.total ?? 0;

  // Check if any product has cost_price > 0 (HPP data availability)
  const cogsCheck = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN products p ON oi.product_id = p.id
     WHERE o.organization_id = ? AND o.status = 'selesai' AND p.cost_price > 0`,
    [orgId]
  );
  const hasCOGSData = (cogsCheck?.cnt ?? 0) > 0;

  const labaKotor = totalRevenue - totalCOGS;

  // 3. Total Biaya Pengeluaran = dari transaksi type='pengeluaran'
  const pengeluaranResult = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE organization_id = ? AND type = 'pengeluaran'`,
    [orgId]
  );
  const totalBiayaPengeluaran = pengeluaranResult?.total ?? 0;

  // 3b. Rincian pengeluaran per kategori
  const expensesByCategory = await queryMany<ExpenseByCategory>(
    `SELECT COALESCE(category, 'Lainnya') as category, SUM(amount) as total
     FROM transactions
     WHERE organization_id = ? AND type = 'pengeluaran'
     GROUP BY category
     ORDER BY total DESC`,
    [orgId]
  );

  // 4. Laba Bersih = Laba Kotor - Total Biaya Pengeluaran
  const labaBersih = labaKotor - totalBiayaPengeluaran;

  return {
    totalRevenue,
    totalCOGS,
    labaKotor,
    totalBiayaPengeluaran,
    expensesByCategory,
    labaBersih,
    hasCOGSData,
  };
}

// ─── Get Sales Report ──────────────────────────────────────────
export async function getSalesReport(): Promise<SalesReport> {
  const orgId = await getOrganizationId();

  const totalOrders = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM orders WHERE organization_id = ? AND status = 'selesai'",
    [orgId]
  );

  const totalRevenue = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE organization_id = ? AND status = 'selesai'",
    [orgId]
  );

  const count = totalOrders?.count ?? 0;
  const revenue = totalRevenue?.total ?? 0;

  return {
    totalOrders: count,
    totalRevenue: revenue,
    averageOrder: count > 0 ? Math.round(revenue / count) : 0,
  };
}

// ─── Get Inventory Value ───────────────────────────────────────
export async function getInventoryValue(): Promise<ProductReport[]> {
  const orgId = await getOrganizationId();

  return queryMany<ProductReport>(
    `SELECT code, name, current_stock, cost_price, selling_price, (current_stock * cost_price) as stock_value
     FROM products
     WHERE organization_id = ? AND is_active = 1 AND current_stock > 0
     ORDER BY stock_value DESC`,
    [orgId]
  );
}

// ─── Get Top Customers ─────────────────────────────────────────
export async function getTopCustomers(limit: number = 5): Promise<TopCustomer[]> {
  const orgId = await getOrganizationId();

  return queryMany<TopCustomer>(
    `SELECT c.name as customer_name, c.code as customer_code, COUNT(o.id) as total_orders, COALESCE(SUM(o.total_amount), 0) as total_amount
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'selesai'
     WHERE c.organization_id = ?
     GROUP BY c.id
     ORDER BY total_amount DESC
     LIMIT ${Math.min(Math.max(limit, 1), 100)}`,
    [orgId]
  );
}

// ─── Get Top Products ──────────────────────────────────────────
export async function getTopProducts(limit: number = 5): Promise<TopProduct[]> {
  const orgId = await getOrganizationId();

  return queryMany<TopProduct>(
    `SELECT oi.product_name, oi.product_code, SUM(oi.quantity) as total_quantity, SUM(oi.subtotal) as total_revenue
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.organization_id = ? AND o.status = 'selesai'
     GROUP BY oi.product_id
     ORDER BY total_revenue DESC
     LIMIT ${Math.min(Math.max(limit, 1), 100)}`,
    [orgId]
  );
}
