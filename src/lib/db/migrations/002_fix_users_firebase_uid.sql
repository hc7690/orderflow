-- ═══════════════════════════════════════════════════════════════
-- OrderFlow — Migration 002: Fix users table for Firebase Auth
-- ═══════════════════════════════════════════════════════════════
-- Menambahkan kolom firebase_uid dan menghapus password_hash
-- karena autentikasi menggunakan Firebase Auth, bukan password.
-- ═══════════════════════════════════════════════════════════════

-- Tambah kolom firebase_uid
ALTER TABLE users ADD COLUMN firebase_uid TEXT;

-- Buat index untuk firebase_uid agar lookup cepat
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Buat unique constraint untuk firebase_uid
-- (libSQL tidak support ADD CONSTRAINT, jadi kita pakai index unik)
-- Hapus index lama jika ada, buat baru yang unik
DROP INDEX IF EXISTS idx_users_firebase_uid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Hapus kolom password_hash (libSQL tidak support DROP COLUMN)
-- Kita biarkan kolom password_hash karena tidak akan digunakan
-- dan libSQL tidak mendukung DROP COLUMN pada versi tertentu
