-- ═══════════════════════════════════════════════════════════════
-- OrderFlow — Migration 003: Make password_hash nullable
-- ═══════════════════════════════════════════════════════════════
-- Root cause: Migration 001 defines password_hash TEXT NOT NULL,
-- but Firebase Auth users don't have a local password.
-- Auto-provision INSERT omits password_hash, violating the constraint.
--
-- SQLite/Turso doesn't support ALTER COLUMN, so we rebuild the
-- users table without the NOT NULL constraint on password_hash.
-- All existing data is preserved via backup → copy → drop.
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Rename existing table as backup
ALTER TABLE users RENAME TO users_backup;

-- Step 2: Create new users table with nullable password_hash
CREATE TABLE users (
    id            TEXT PRIMARY KEY NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    phone         TEXT,
    password_hash TEXT,
    firebase_uid  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 3: Copy all existing data
INSERT INTO users (id, email, name, phone, password_hash, created_at, updated_at)
SELECT id, email, name, phone, password_hash, created_at, updated_at
FROM users_backup;

-- Step 4: Drop the backup table
DROP TABLE users_backup;

-- Step 5: Recreate indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid_unique ON users(firebase_uid);
