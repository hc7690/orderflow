/**
 * OrderFlow — Database Migration Runner
 *
 * Jalankan migration dari terminal:
 *   npm run db:migrate
 *   npx tsx src/lib/db/migrate.ts
 *
 * ⚠️  Hanya untuk penggunaan di sisi server / development.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getDb } from "./client";

const MIGRATIONS_DIR = join(__dirname, "migrations");

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Bersihkan SQL dari komentar & PRAGMA yang tidak didukung Turso,
 * lalu split per-statement dengan aman.
 */
function cleanSql(raw: string): string[] {
  // Hapus komentar satu baris (--) tapi jangan hapus URL yang mengandung '--'
  let sql = raw.replace(/^(?!.*https?:\/\/).*--.*$/gm, "");

  // Hapus komentar blok /* ... */
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, "");

  // Hapus PRAGMA (tidak didukung via execute API Turso)
  sql = sql.replace(/^PRAGMA\s+[\w\s=]+;?\s*$/gim, "");

  // Split by semicolon, trim, filter kosong
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ═══════════════════════════════════════════════════════════════
// Tabel pelacakan migration
// ═══════════════════════════════════════════════════════════════

async function ensureMigrationTable(db: ReturnType<typeof getDb>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

async function getAppliedMigrations(
  db: ReturnType<typeof getDb>
): Promise<Set<string>> {
  const result = await db.execute("SELECT name FROM _migrations ORDER BY id");
  return new Set(result.rows.map((row) => row.name as string));
}

// ═══════════════════════════════════════════════════════════════
// Jalankan migration
// ═══════════════════════════════════════════════════════════════

async function runMigrations() {
  const db = getDb();

  console.log("🔄 Memeriksa database...\n");

  // Buat tabel pelacakan
  await ensureMigrationTable(db);

  // Ambil semua file migration
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("ℹ️  Tidak ada file migration ditemukan.");
    return;
  }

  // Ambil migration yang sudah dijalankan
  const applied = await getAppliedMigrations(db);

  // Filter migration yang belum dijalankan
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("✅ Semua migration sudah dijalankan.");
    return;
  }

  console.log(`📋 Ditemukan ${pending.length} migration baru:\n`);

  for (const file of pending) {
    const filePath = join(MIGRATIONS_DIR, file);
    const raw = readFileSync(filePath, "utf-8");

    console.log(`  ▶ Menjalankan: ${file}`);

    try {
      // Bersihkan & parse SQL
      const statements = cleanSql(raw);
      console.log(`     (${statements.length} statements)`);

      // Eksekusi satu per satu (DDL di SQLite auto-commit, tidak bisa dibungkus transaction)
      for (const stmt of statements) {
        await db.execute(stmt);
      }

      // Tandai sebagai selesai
      await db.execute({
        sql: "INSERT INTO _migrations (name) VALUES (?)",
        args: [file],
      });

      console.log(`  ✅ Selesai: ${file}\n`);
    } catch (error) {
      console.error(`  ❌ Gagal: ${file}`);
      console.error(`     Error: ${error}\n`);
      process.exit(1);
    }
  }

  console.log(`🎉 Semua migration berhasil dijalankan!`);
}

// ═══════════════════════════════════════════════════════════════
// Jalankan
// ═══════════════════════════════════════════════════════════════

runMigrations().catch((error) => {
  console.error("❌ Migration gagal:", error);
  process.exit(1);
});
