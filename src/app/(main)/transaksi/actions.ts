"use server";

/**
 * OrderFlow — Transaction Server Actions
 *
 * Server actions untuk operasi CRUD transaksi pembayaran masuk & keluar.
 */

import { queryMany, queryOne, execute } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";
import { generateId } from "@/lib/utils";

// ─── Tipe Data ─────────────────────────────────────────────────
export interface Transaction {
  id: string;
  organization_id: string;
  type: "pemasukan" | "pengeluaran";
  reference_type: string | null;
  reference_id: string | null;
  amount: number;
  payment_method: string | null;
  category: string | null;
  description: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  type: "pemasukan" | "pengeluaran";
  reference_type?: string;
  reference_id?: string;
  amount: number;
  payment_method?: string;
  category?: string;
  description: string;
  transaction_date?: string;
}

// ─── Get All Transactions ──────────────────────────────────────
export async function getTransactions(
  search?: string,
  type?: string
): Promise<Transaction[]> {
  const orgId = await getOrganizationId();

  let sql = "SELECT * FROM transactions WHERE organization_id = ?";
  const args: (string | number)[] = [orgId];

  if (search) {
    sql += " AND description LIKE ?";
    args.push(`%${search}%`);
  }

  if (type) {
    sql += " AND type = ?";
    args.push(type);
  }

  sql += " ORDER BY created_at DESC";

  return queryMany<Transaction>(sql, args);
}

// ─── Create Transaction ────────────────────────────────────────
export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  const orgId = await getOrganizationId();
  const id = generateId();

  if (input.amount <= 0) {
    throw new Error("Jumlah harus lebih dari 0");
  }

  if (!input.description.trim()) {
    throw new Error("Deskripsi wajib diisi");
  }

  await execute(
    `INSERT INTO transactions (id, organization_id, type, reference_type, reference_id, amount, payment_method, category, description, transaction_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      orgId,
      input.type,
      input.reference_type || null,
      input.reference_id || null,
      input.amount,
      input.payment_method || null,
      input.category || null,
      input.description,
      input.transaction_date || new Date().toISOString().split("T")[0],
    ]
  );

  return queryOne<Transaction>(
    "SELECT * FROM transactions WHERE id = ?",
    [id]
  ) as Promise<Transaction>;
}

// ─── Delete Transaction ────────────────────────────────────────
export async function deleteTransaction(id: string): Promise<void> {
  const orgId = await getOrganizationId();

  const tx = await queryOne<Transaction>(
    "SELECT * FROM transactions WHERE id = ? AND organization_id = ?",
    [id, orgId]
  );
  if (!tx) throw new Error("Transaksi tidak ditemukan");

  if (tx.reference_type && tx.reference_id) {
    throw new Error("Transaksi yang terhubung dengan order/pembelian tidak dapat dihapus");
  }

  await execute("DELETE FROM transactions WHERE id = ? AND organization_id = ?", [id, orgId]);
}

// ─── Get Stats ─────────────────────────────────────────────────
export async function getTransactionStats() {
  const orgId = await getOrganizationId();

  const totalPemasukan = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pemasukan'",
    [orgId]
  );

  const totalPengeluaran = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE organization_id = ? AND type = 'pengeluaran'",
    [orgId]
  );

  const countPemasukan = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM transactions WHERE organization_id = ? AND type = 'pemasukan'",
    [orgId]
  );

  const countPengeluaran = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM transactions WHERE organization_id = ? AND type = 'pengeluaran'",
    [orgId]
  );

  return {
    totalPemasukan: totalPemasukan?.total ?? 0,
    totalPengeluaran: totalPengeluaran?.total ?? 0,
    countPemasukan: countPemasukan?.count ?? 0,
    countPengeluaran: countPengeluaran?.count ?? 0,
  };
}
