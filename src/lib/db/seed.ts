/**
 * OrderFlow — Database Seed Script
 *
 * Menambahkan data awal untuk testing:
 * - 1 Organization
 * - 1 User (admin)
 * - Relasi organization_users
 *
 * Jalankan dari terminal:
 *   npm run db:seed
 *
 * ⚠️  Hanya untuk penggunaan di sisi server / development.
 */

import { getDb } from "./client";
import { generateId } from "../utils";

const ORG_ID = "org_default_001";
const USER_ID = "user_admin_001";

async function seed() {
  const db = getDb();

  console.log("🌱 Memulai seed database...\n");

  // ─── 1. Buat Organization ──────────────────────────────────
  console.log("  ▶ Membuat organization...");
  await db.execute({
    sql: `INSERT OR IGNORE INTO organizations (id, name, slug, phone, address)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      ORG_ID,
      "Toko OrderFlow",
      "tokorflow",
      "08123456789",
      "Jl. Contoh No. 123, Jakarta",
    ],
  });
  console.log("  ✅ Organization dibuat\n");

  // ─── 2. Buat User (Firebase Auth placeholder) ──────────────
  console.log("  ▶ Membuat user admin...");
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (id, firebase_uid, email, name, phone, password_hash)
          VALUES (?, ?, ?, ?, ?, NULL)`,
    args: [
      USER_ID,
      "firebase_uid_admin_001",
      "admin@orderflow.id",
      "Admin OrderFlow",
      "08123456789",
    ],
  });
  console.log("  ✅ User admin dibuat\n");

  // ─── 3. Buat Relasi Organization ↔ User ────────────────────
  console.log("  ▶ Membuat relasi organization-user...");
  const orgUserId = generateId();
  await db.execute({
    sql: `INSERT OR IGNORE INTO organization_users (id, organization_id, user_id, role)
          VALUES (?, ?, ?, ?)`,
    args: [orgUserId, ORG_ID, USER_ID, "owner"],
  });
  console.log("  ✅ Relasi dibuat (role: owner)\n");

  // ─── 4. Buat Sample Customers ──────────────────────────────
  console.log("  ▶ Membuat sample customers...");
  const customers = [
    { code: "C0001", name: "PT Maju Jaya", email: "info@majujaya.co.id", phone: "021-5551234" },
    { code: "C0002", name: "Toko Berkah", email: null, phone: "0812-5678-9012" },
    { code: "C0003", name: "CV Sejahtera", email: "sejahtera@mail.com", phone: "0856-1234-5678" },
  ];

  for (const c of customers) {
    const id = generateId();
    await db.execute({
      sql: `INSERT OR IGNORE INTO customers (id, organization_id, code, name, email, phone)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, ORG_ID, c.code, c.name, c.email, c.phone],
    });
  }
  console.log("  ✅ 3 customers dibuat\n");

  // ─── 5. Buat Sample Products ───────────────────────────────
  console.log("  ▶ Membuat sample products...");
  const products = [
    { code: "P0001", name: "Laptop ASUS VivoBook", unit: "pcs", cost: 8500000, selling: 10500000, stock: 15, min: 3 },
    { code: "P0002", name: "Mouse Logitech G102", unit: "pcs", cost: 150000, selling: 225000, stock: 50, min: 10 },
    { code: "P0003", name: "Keyboard Mechanical RGB", unit: "pcs", cost: 350000, selling: 525000, stock: 30, min: 5 },
    { code: "P0004", name: "Monitor LG 24 inch", unit: "pcs", cost: 2200000, selling: 2800000, stock: 8, min: 2 },
    { code: "P0005", name: "Kabel HDMI 2m", unit: "pcs", cost: 35000, selling: 65000, stock: 100, min: 20 },
  ];

  const productIds: string[] = [];
  for (const p of products) {
    const id = generateId();
    productIds.push(id);
    await db.execute({
      sql: `INSERT OR IGNORE INTO products (id, organization_id, code, name, unit, cost_price, selling_price, current_stock, min_stock)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, ORG_ID, p.code, p.name, p.unit, p.cost, p.selling, p.stock, p.min],
    });
  }
  console.log("  ✅ 5 products dibuat\n");

  // ─── 6. Buat Sample Transactions ───────────────────────────
  console.log("  ▶ Membuat sample transactions...");
  const today = new Date().toISOString().split("T")[0];

  const transactions = [
    { type: "pemasukan", amount: 5000000, desc: "Pendapatan awal", method: "transfer" },
    { type: "pengeluaran", amount: 2000000, desc: "Biaya operasional", method: "tunai" },
    { type: "pemasukan", amount: 3500000, desc: "Penjualan produk", method: "transfer" },
    { type: "pengeluaran", amount: 1500000, desc: "Pembelian ATK", method: "e_wallet" },
  ];

  for (const t of transactions) {
    const id = generateId();
    await db.execute({
      sql: `INSERT INTO transactions (id, organization_id, type, amount, payment_method, description, transaction_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, ORG_ID, t.type, t.amount, t.method, t.desc, today],
    });
  }
  console.log("  ✅ 4 transactions dibuat\n");

  console.log("🎉 Seed database berhasil!");
  console.log("\n📧 Login dengan Firebase Auth:");
  console.log("   Email: admin@orderflow.id");
  console.log("   (Buat akun Firebase Auth dengan email tersebut)\n");
}

seed().catch((error) => {
  console.error("❌ Seed gagal:", error);
  process.exit(1);
});
