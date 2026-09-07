"use server";

/**
 * OrderFlow — Product Server Actions
 *
 * Server actions untuk operasi CRUD produk.
 */

import { queryMany, queryOne, execute } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";
import { generateId } from "@/lib/utils";

// ─── Tipe Data ─────────────────────────────────────────────────
export interface Product {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  code: string;
  name: string;
  description?: string;
  unit?: string;
  cost_price: number;
  selling_price: number;
  min_stock?: number;
}

export interface UpdateProductInput {
  id: string;
  code: string;
  name: string;
  description?: string;
  unit?: string;
  cost_price: number;
  selling_price: number;
  min_stock?: number;
  is_active?: number;
}

// ─── Get All Products ──────────────────────────────────────────
export async function getProducts(search?: string): Promise<Product[]> {
  const orgId = await getOrganizationId();

  let sql = "SELECT * FROM products WHERE organization_id = ?";
  const args: (string | number)[] = [orgId];

  if (search) {
    sql += " AND (name LIKE ? OR code LIKE ? OR description LIKE ?)";
    const searchPattern = `%${search}%`;
    args.push(searchPattern, searchPattern, searchPattern);
  }

  sql += " ORDER BY created_at DESC";

  return queryMany<Product>(sql, args);
}

// ─── Get Active Products ───────────────────────────────────────
export async function getActiveProducts(): Promise<Product[]> {
  const orgId = await getOrganizationId();

  return queryMany<Product>(
    "SELECT * FROM products WHERE organization_id = ? AND is_active = 1 ORDER BY name",
    [orgId]
  );
}

// ─── Get Product by ID ─────────────────────────────────────────
export async function getProduct(id: string): Promise<Product | null> {
  const orgId = await getOrganizationId();

  return queryOne<Product>(
    "SELECT * FROM products WHERE id = ? AND organization_id = ?",
    [id, orgId]
  );
}

// ─── Create Product ────────────────────────────────────────────
export async function createProduct(
  input: CreateProductInput
): Promise<Product> {
  const orgId = await getOrganizationId();
  const id = generateId();

  // Check if code already exists in this organization
  const existing = await queryOne<Product>(
    "SELECT id FROM products WHERE code = ? AND organization_id = ?",
    [input.code, orgId]
  );

  if (existing) {
    throw new Error("Kode produk sudah digunakan");
  }

  await execute(
    `INSERT INTO products (id, organization_id, code, name, description, unit, cost_price, selling_price, min_stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      orgId,
      input.code,
      input.name,
      input.description || null,
      input.unit || "pcs",
      input.cost_price,
      input.selling_price,
      input.min_stock ?? 0,
    ]
  );

  return getProduct(id) as Promise<Product>;
}

// ─── Update Product ────────────────────────────────────────────
export async function updateProduct(
  input: UpdateProductInput
): Promise<Product> {
  const orgId = await getOrganizationId();

  // Check if code already exists (excluding current product)
  const existing = await queryOne<Product>(
    "SELECT id FROM products WHERE code = ? AND organization_id = ? AND id != ?",
    [input.code, orgId, input.id]
  );

  if (existing) {
    throw new Error("Kode produk sudah digunakan");
  }

  await execute(
    `UPDATE products 
     SET code = ?, name = ?, description = ?, unit = ?, cost_price = ?, selling_price = ?, min_stock = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ? AND organization_id = ?`,
    [
      input.code,
      input.name,
      input.description || null,
      input.unit || "pcs",
      input.cost_price,
      input.selling_price,
      input.min_stock ?? 0,
      input.is_active ?? 1,
      input.id,
      orgId,
    ]
  );

  return getProduct(input.id) as Promise<Product>;
}

// ─── Delete Product ────────────────────────────────────────────
export async function deleteProduct(id: string): Promise<void> {
  const orgId = await getOrganizationId();

  // Check if product has any order items or purchase items
  const orderItems = await queryMany(
    "SELECT id FROM order_items WHERE product_id = ? LIMIT 1",
    [id]
  );

  if (orderItems.length > 0) {
    throw new Error(
      "Produk tidak dapat dihapus karena tercantum dalam data order"
    );
  }

  const purchaseItems = await queryMany(
    "SELECT id FROM purchase_items WHERE product_id = ? LIMIT 1",
    [id]
  );

  if (purchaseItems.length > 0) {
    throw new Error(
      "Produk tidak dapat dihapus karena tercantum dalam data pembelian"
    );
  }

  await execute("DELETE FROM products WHERE id = ? AND organization_id = ?", [
    id,
    orgId,
  ]);
}

// ─── Get Product Stats ─────────────────────────────────────────
export async function getProductStats() {
  const orgId = await getOrganizationId();

  const total = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE organization_id = ?",
    [orgId]
  );

  const active = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND is_active = 1",
    [orgId]
  );

  const lowStock = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND is_active = 1 AND current_stock <= min_stock AND min_stock > 0",
    [orgId]
  );

  return {
    total: total?.count ?? 0,
    active: active?.count ?? 0,
    lowStock: lowStock?.count ?? 0,
  };
}
