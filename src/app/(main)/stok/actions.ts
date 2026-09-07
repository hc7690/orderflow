"use server";

/**
 * OrderFlow — Stock Server Actions
 *
 * Server actions untuk manajemen stok dan riwayat pergerakan stok.
 */

import { queryMany, queryOne, execute } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";
import { generateId } from "@/lib/utils";

// ─── Tipe Data ─────────────────────────────────────────────────
export interface StockMovement {
  id: string;
  organization_id: string;
  product_id: string;
  type: "masuk" | "keluar" | "penyesuaian";
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  movement_date: string;
  created_at: string;
}

export interface StockProduct {
  id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  is_active: number;
}

export interface CreateStockMovementInput {
  product_id: string;
  type: "masuk" | "keluar" | "penyesuaian";
  quantity: number;
  notes?: string;
}

// ─── Get All Products with Stock ───────────────────────────────
export async function getStockProducts(
  search?: string
): Promise<StockProduct[]> {
  const orgId = await getOrganizationId();

  let sql =
    "SELECT id, code, name, unit, current_stock, min_stock, is_active FROM products WHERE organization_id = ?";
  const args: (string | number)[] = [orgId];

  if (search) {
    sql += " AND (name LIKE ? OR code LIKE ?)";
    const searchPattern = `%${search}%`;
    args.push(searchPattern, searchPattern);
  }

  sql += " ORDER BY name";

  return queryMany<StockProduct>(sql, args);
}

// ─── Get Stock Movements ───────────────────────────────────────
export async function getStockMovements(
  productId?: string,
  type?: string
): Promise<(StockMovement & { product_name: string; product_code: string })[]> {
  const orgId = await getOrganizationId();

  let sql = `
    SELECT sm.*, p.name as product_name, p.code as product_code
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE sm.organization_id = ?
  `;
  const args: (string | number)[] = [orgId];

  if (productId) {
    sql += " AND sm.product_id = ?";
    args.push(productId);
  }

  if (type) {
    sql += " AND sm.type = ?";
    args.push(type);
  }

  sql += " ORDER BY sm.created_at DESC LIMIT 100";

  return queryMany(sql, args);
}

// ─── Create Stock Movement ─────────────────────────────────────
export async function createStockMovement(
  input: CreateStockMovementInput
): Promise<void> {
  const orgId = await getOrganizationId();

  // Get current stock
  const product = await queryOne<StockProduct>(
    "SELECT id, current_stock FROM products WHERE id = ? AND organization_id = ?",
    [input.product_id, orgId]
  );

  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  // Calculate new stock
  let newStock = product.current_stock;
  if (input.type === "masuk") {
    newStock += input.quantity;
  } else if (input.type === "keluar") {
    if (product.current_stock < input.quantity) {
      throw new Error(
        `Stok tidak mencukupi. Stok saat ini: ${product.current_stock}`
      );
    }
    newStock -= input.quantity;
  } else if (input.type === "penyesuaian") {
    newStock = input.quantity; // Direct set for adjustment
  }

  // Insert movement record
  const id = generateId();
  await execute(
    `INSERT INTO stock_movements (id, organization_id, product_id, type, quantity, reference_type, reference_id, notes)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)`,
    [id, orgId, input.product_id, input.type, input.quantity, input.notes || null]
  );

  // Update product stock
  await execute(
    "UPDATE products SET current_stock = ?, updated_at = datetime('now') WHERE id = ? AND organization_id = ?",
    [newStock, input.product_id, orgId]
  );
}

// ─── Get Stock Stats ───────────────────────────────────────────
export async function getStockStats() {
  const orgId = await getOrganizationId();

  const totalProducts = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND is_active = 1",
    [orgId]
  );

  const lowStock = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND is_active = 1 AND current_stock <= min_stock AND min_stock > 0",
    [orgId]
  );

  const outOfStock = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND is_active = 1 AND current_stock = 0",
    [orgId]
  );

  return {
    totalProducts: totalProducts?.count ?? 0,
    lowStock: lowStock?.count ?? 0,
    outOfStock: outOfStock?.count ?? 0,
  };
}
