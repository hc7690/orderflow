"use server";

/**
 * OrderFlow — Purchase Server Actions
 *
 * Server actions untuk operasi CRUD pembelian / order keluar ke supplier.
 */

import { queryMany, queryOne, execute } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";
import { generateId } from "@/lib/utils";

// ─── Tipe Data ─────────────────────────────────────────────────
export interface Purchase {
  id: string;
  organization_id: string;
  code: string;
  supplier_name: string;
  supplier_contact: string | null;
  status: "draft" | "dikonfirmasi" | "selesai" | "dibatalkan";
  total_amount: number;
  discount: number;
  notes: string | null;
  purchase_date: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface CreatePurchaseInput {
  supplier_name: string;
  supplier_contact?: string;
  discount?: number;
  notes?: string;
  purchase_date?: string;
  items: {
    product_id: string;
    product_code: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
}

// ─── Get All Purchases ─────────────────────────────────────────
export async function getPurchases(search?: string, status?: string): Promise<Purchase[]> {
  const orgId = await getOrganizationId();

  let sql = "SELECT * FROM purchases WHERE organization_id = ?";
  const args: (string | number)[] = [orgId];

  if (search) {
    sql += " AND (code LIKE ? OR supplier_name LIKE ?)";
    const searchPattern = `%${search}%`;
    args.push(searchPattern, searchPattern);
  }

  if (status) {
    sql += " AND status = ?";
    args.push(status);
  }

  sql += " ORDER BY created_at DESC";

  return queryMany<Purchase>(sql, args);
}

// ─── Get Purchase by ID ────────────────────────────────────────
export async function getPurchase(id: string): Promise<Purchase | null> {
  const orgId = await getOrganizationId();

  return queryOne<Purchase>(
    "SELECT * FROM purchases WHERE id = ? AND organization_id = ?",
    [id, orgId]
  );
}

// ─── Get Purchase Items ────────────────────────────────────────
export async function getPurchaseItems(purchaseId: string): Promise<PurchaseItem[]> {
  const orgId = await getOrganizationId();

  // Verify purchase belongs to this organization
  const purchase = await queryOne(
    "SELECT id FROM purchases WHERE id = ? AND organization_id = ?",
    [purchaseId, orgId]
  );

  if (!purchase) {
    throw new Error("Pembelian tidak ditemukan");
  }

  return queryMany<PurchaseItem>(
    "SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY created_at",
    [purchaseId]
  );
}

// ─── Generate Next Code ────────────────────────────────────────
async function getNextPurchaseCode(orgId: string): Promise<string> {
  const last = await queryOne<{ code: string }>(
    "SELECT code FROM purchases WHERE organization_id = ? ORDER BY created_at DESC LIMIT 1",
    [orgId]
  );

  if (!last) return "PUR-0001";

  const lastNum = parseInt(last.code.split("-")[1], 10);
  return `PUR-${String((lastNum || 0) + 1).padStart(4, "0")}`;
}

// ─── Create Purchase ───────────────────────────────────────────
export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  const orgId = await getOrganizationId();
  const id = generateId();
  const code = await getNextPurchaseCode(orgId);

  if (!input.items || input.items.length === 0) {
    throw new Error("Pembelian harus memiliki minimal 1 item");
  }

  let totalAmount = 0;
  for (const item of input.items) {
    totalAmount += item.quantity * item.unit_price;
  }

  const discount = input.discount ?? 0;
  const finalAmount = totalAmount - discount;

  if (finalAmount < 0) {
    throw new Error("Diskon tidak boleh melebihi total harga");
  }

  await execute(
    `INSERT INTO purchases (id, organization_id, code, supplier_name, supplier_contact, status, total_amount, discount, notes, purchase_date)
     VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
    [
      id,
      orgId,
      code,
      input.supplier_name,
      input.supplier_contact || null,
      finalAmount,
      discount,
      input.notes || null,
      input.purchase_date || new Date().toISOString().split("T")[0],
    ]
  );

  for (const item of input.items) {
    const itemId = generateId();
    const subtotal = item.quantity * item.unit_price;
    await execute(
      `INSERT INTO purchase_items (id, purchase_id, product_id, product_code, product_name, quantity, unit_price, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, id, item.product_id, item.product_code, item.product_name, item.quantity, item.unit_price, subtotal]
    );
  }

  return getPurchase(id) as Promise<Purchase>;
}

// ─── Update Purchase Status ────────────────────────────────────
export async function updatePurchaseStatus(
  id: string,
  status: Purchase["status"]
): Promise<Purchase> {
  const orgId = await getOrganizationId();

  const purchase = await queryOne<Purchase>(
    "SELECT * FROM purchases WHERE id = ? AND organization_id = ?",
    [id, orgId]
  );
  if (!purchase) throw new Error("Pembelian tidak ditemukan");

  const validTransitions: Record<string, string[]> = {
    draft: ["dikonfirmasi", "dibatalkan"],
    dikonfirmasi: ["selesai", "dibatalkan"],
    selesai: [],
    dibatalkan: [],
  };

  if (!validTransitions[purchase.status]?.includes(status)) {
    throw new Error(`Transisi status dari "${purchase.status}" ke "${status}" tidak valid`);
  }

  // If completing, add stock
  if (status === "selesai") {
    const items = await getPurchaseItems(id);
    for (const item of items) {
      await execute(
        "UPDATE products SET current_stock = current_stock + ?, updated_at = datetime('now') WHERE id = ?",
        [item.quantity, item.product_id]
      );

      const movementId = generateId();
      await execute(
        `INSERT INTO stock_movements (id, organization_id, product_id, type, quantity, reference_type, reference_id, notes)
         VALUES (?, ?, ?, 'masuk', ?, 'purchase', ?, ?)`,
        [movementId, orgId, item.product_id, item.quantity, id, `Pembelian ${purchase.code} selesai`]
      );
    }
  }

  await execute(
    "UPDATE purchases SET status = ?, updated_at = datetime('now') WHERE id = ? AND organization_id = ?",
    [status, id, orgId]
  );

  return getPurchase(id) as Promise<Purchase>;
}

// ─── Delete Purchase ───────────────────────────────────────────
export async function deletePurchase(id: string): Promise<void> {
  const orgId = await getOrganizationId();

  const purchase = await queryOne<Purchase>(
    "SELECT * FROM purchases WHERE id = ? AND organization_id = ?",
    [id, orgId]
  );
  if (!purchase) throw new Error("Pembelian tidak ditemukan");
  if (purchase.status !== "draft") throw new Error("Hanya pembelian draft yang dapat dihapus");

  await execute("DELETE FROM purchase_items WHERE purchase_id = ?", [id]);
  await execute("DELETE FROM purchases WHERE id = ? AND organization_id = ?", [id, orgId]);
}

// ─── Get Stats ─────────────────────────────────────────────────
export async function getPurchaseStats() {
  const orgId = await getOrganizationId();

  const total = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM purchases WHERE organization_id = ?", [orgId]
  );
  const draft = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM purchases WHERE organization_id = ? AND status = 'draft'", [orgId]
  );
  const inProgress = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM purchases WHERE organization_id = ? AND status IN ('dikonfirmasi')", [orgId]
  );
  const completed = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM purchases WHERE organization_id = ? AND status = 'selesai'", [orgId]
  );
  const totalSpent = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE organization_id = ? AND status = 'selesai'", [orgId]
  );

  return {
    total: total?.count ?? 0,
    draft: draft?.count ?? 0,
    inProgress: inProgress?.count ?? 0,
    completed: completed?.count ?? 0,
    totalSpent: totalSpent?.total ?? 0,
  };
}
