/**
 * OrderFlow — Database Client (Turso / libSQL)
 *
 * File ini HANYA boleh di-import di sisi server
 * (Server Components, Server Actions, Route Handlers).
 *
 * Jangan pernah import file ini di komponen client ("use client").
 */

import {
  createClient,
  type Client,
  type InValue,
} from "@libsql/client";

// ─── Validasi Environment Variable ──────────────────────────────

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[OrderFlow] Environment variable "${key}" belum diatur. ` +
        `Silakan isi di file .env.local.`
    );
  }
  return value;
}

// ─── Singleton Client ───────────────────────────────────────────

let _client: Client | null = null;

/**
 * Mendapatkan instance database client Turso.
 *
 * Menggunakan pola singleton agar koneksi di-reuse
 * di seluruh request (hemat resource di production).
 *
 * @example
 * ```ts
 * // Di Server Component atau Server Action
 * import { db } from "@/lib/db/client";
 *
 * const result = await db.execute("SELECT 1");
 * ```
 */
export function getDb(): Client {
  if (_client) return _client;

  const url = getEnv("TURSO_DATABASE_URL");
  const authToken = getEnv("TURSO_AUTH_TOKEN");

  _client = createClient({
    url,
    authToken,
  });

  return _client;
}

/**
 * Alias singkat untuk digunakan di seluruh aplikasi.
 * Contoh: `import { db } from "@/lib/db/client";`
 */
export const db = getDb();

/**
 * Fungsi utilitas untuk menjalankan query dengan error handling.
 * Berguna untuk Server Actions dan Route Handlers.
 *
 * @example
 * ```ts
 * import { queryMany, queryOne } from "@/lib/db/client";
 *
 * const users = await queryMany<{ id: number; nama: string }>(
 *   "SELECT * FROM users"
 * );
 * ```
 */
export async function queryMany<T = Record<string, unknown>>(
  sql: string,
  args?: InValue[]
): Promise<T[]> {
  const client = getDb();
  const result = await client.execute({ sql, args: args ?? [] });
  // Turso Row objects have internal methods that are not serializable.
  // Convert to plain objects so Server Actions can pass them to Client Components.
  return result.rows.map((row) => {
    const plain: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      plain[key] = (row as Record<string, unknown>)[key];
    }
    return plain as T;
  });
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args?: InValue[]
): Promise<T | null> {
  const rows = await queryMany<T>(sql, args);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  args?: InValue[]
): Promise<void> {
  const client = getDb();
  await client.execute({ sql, args: args ?? [] });
}
