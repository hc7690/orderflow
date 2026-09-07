"use server";

/**
 * OrderFlow — Customer Server Actions
 *
 * Server actions untuk operasi CRUD customer.
 */

import { queryMany, queryOne, execute } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";
import { generateId } from "@/lib/utils";

// ─── Tipe Data ─────────────────────────────────────────────────
export interface Customer {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

// ─── Get All Customers ─────────────────────────────────────────
export async function getCustomers(search?: string): Promise<Customer[]> {
  const orgId = await getOrganizationId();

  let sql = "SELECT * FROM customers WHERE organization_id = ?";
  const args: (string | number)[] = [orgId];

  if (search) {
    sql += " AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR email LIKE ?)";
    const searchPattern = `%${search}%`;
    args.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  sql += " ORDER BY created_at DESC";

  return queryMany<Customer>(sql, args);
}

// ─── Get Customer by ID ────────────────────────────────────────
export async function getCustomer(id: string): Promise<Customer | null> {
  const orgId = await getOrganizationId();

  return queryOne<Customer>(
    "SELECT * FROM customers WHERE id = ? AND organization_id = ?",
    [id, orgId]
  );
}

// ─── Create Customer ───────────────────────────────────────────
export async function createCustomer(
  input: CreateCustomerInput
): Promise<Customer> {
  const orgId = await getOrganizationId();
  const id = generateId();

  // Check if code already exists in this organization
  const existing = await queryOne<Customer>(
    "SELECT id FROM customers WHERE code = ? AND organization_id = ?",
    [input.code, orgId]
  );

  if (existing) {
    throw new Error("Kode customer sudah digunakan");
  }

  await execute(
    `INSERT INTO customers (id, organization_id, code, name, email, phone, address, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      orgId,
      input.code,
      input.name,
      input.email || null,
      input.phone || null,
      input.address || null,
      input.notes || null,
    ]
  );

  return getCustomer(id) as Promise<Customer>;
}

// ─── Update Customer ───────────────────────────────────────────
export async function updateCustomer(
  input: UpdateCustomerInput
): Promise<Customer> {
  const orgId = await getOrganizationId();

  // Check if code already exists (excluding current customer)
  const existing = await queryOne<Customer>(
    "SELECT id FROM customers WHERE code = ? AND organization_id = ? AND id != ?",
    [input.code, orgId, input.id]
  );

  if (existing) {
    throw new Error("Kode customer sudah digunakan");
  }

  await execute(
    `UPDATE customers 
     SET code = ?, name = ?, email = ?, phone = ?, address = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ? AND organization_id = ?`,
    [
      input.code,
      input.name,
      input.email || null,
      input.phone || null,
      input.address || null,
      input.notes || null,
      input.id,
      orgId,
    ]
  );

  return getCustomer(input.id) as Promise<Customer>;
}

// ─── Delete Customer ───────────────────────────────────────────
export async function deleteCustomer(id: string): Promise<void> {
  const orgId = await getOrganizationId();

  // Check if customer has any orders
  const orders = await queryMany(
    "SELECT id FROM orders WHERE customer_id = ? LIMIT 1",
    [id]
  );

  if (orders.length > 0) {
    throw new Error("Customer tidak dapat dihapus karena memiliki data order");
  }

  await execute("DELETE FROM customers WHERE id = ? AND organization_id = ?", [
    id,
    orgId,
  ]);
}

// ─── Get Customer Stats ────────────────────────────────────────
export async function getCustomerStats() {
  const orgId = await getOrganizationId();

  const total = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM customers WHERE organization_id = ?",
    [orgId]
  );

  return {
    total: total?.count ?? 0,
  };
}
