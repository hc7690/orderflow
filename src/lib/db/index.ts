/**
 * OrderFlow — Database Module
 *
 * Impor semua kebutuhan database dari sini:
 *
 * ```ts
 * import { db, queryMany, queryOne, execute } from "@/lib/db";
 * ```
 *
 * ⚠️  Hanya untuk penggunaan di sisi server.
 */

export { db, getDb, queryMany, queryOne, execute } from "./client";
export type { InValue } from "@libsql/client";
