-- ═══════════════════════════════════════════════════════════════
-- OrderFlow — Migration 001: Initial Schema
-- ═══════════════════════════════════════════════════════════════
-- Database: Turso / libSQL (SQLite-compatible)
-- Tanggal: 2026-09-02
-- Keterangan: Schema awal untuk sistem multi-tenant OrderFlow
-- ═══════════════════════════════════════════════════════════════

-- Aktifkan foreign key support (SQLite perlu diaktifkan per sesi)
PRAGMA foreign_keys = ON;

-- ═══════════════════════════════════════════════════════════════
-- 1. ORGANIZATIONS (Multi-tenant)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    phone       TEXT,
    address     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════
-- 2. USERS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    phone       TEXT,
    password_hash TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════
-- 3. ORGANIZATION_USERS (Relasi User ↔ Organization)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS organization_users (
    id              TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_users_org ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_role ON organization_users(organization_id, role);

-- ═══════════════════════════════════════════════════════════════
-- 4. CUSTOMERS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customers (
    id              TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    address         TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(organization_id, name);

-- ═══════════════════════════════════════════════════════════════
-- 5. PRODUCTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS products (
    id              TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    unit            TEXT NOT NULL DEFAULT 'pcs',
    cost_price      INTEGER NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    selling_price   INTEGER NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    current_stock   INTEGER NOT NULL DEFAULT 0,
    min_stock       INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(organization_id, is_active);

-- ═══════════════════════════════════════════════════════════════
-- 6. ORDERS (Order Masuk dari Customer)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id     TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    code            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'dikonfirmasi', 'diproses', 'selesai', 'dibatalkan')),
    total_amount    INTEGER NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    discount        INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0),
    notes           TEXT,
    order_date      TEXT NOT NULL DEFAULT (date('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_orders_org ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(organization_id, order_date);

-- ═══════════════════════════════════════════════════════════════
-- 7. ORDER_ITEMS (Detail Item Order)
-- Menyimpan nama & harga produk saat transaksi (histori)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS order_items (
    id          TEXT PRIMARY KEY NOT NULL,
    order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  INTEGER NOT NULL CHECK (unit_price >= 0),
    subtotal    INTEGER NOT NULL CHECK (subtotal >= 0),
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ═══════════════════════════════════════════════════════════════
-- 8. PURCHASES (Pembelian / Order Keluar ke Supplier)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS purchases (
    id              TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    supplier_name   TEXT NOT NULL,
    supplier_contact TEXT,
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'dikonfirmasi', 'selesai', 'dibatalkan')),
    total_amount    INTEGER NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    discount        INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0),
    notes           TEXT,
    purchase_date   TEXT NOT NULL DEFAULT (date('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_purchases_org ON purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(organization_id, purchase_date);

-- ═══════════════════════════════════════════════════════════════
-- 9. PURCHASE_ITEMS (Detail Item Pembelian)
-- Menyimpan nama & harga produk saat transaksi (histori)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS purchase_items (
    id              TEXT PRIMARY KEY NOT NULL,
    purchase_id     TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_code    TEXT NOT NULL,
    product_name    TEXT NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      INTEGER NOT NULL CHECK (unit_price >= 0),
    subtotal        INTEGER NOT NULL CHECK (subtotal >= 0),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);

-- ═══════════════════════════════════════════════════════════════
-- 10. TRANSAKSI (Pembayaran Pemasukan & Pengeluaran)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transactions (
    id              TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
    reference_type  TEXT CHECK (reference_type IN ('order', 'purchase', 'manual')),
    reference_id    TEXT,
    amount          INTEGER NOT NULL CHECK (amount > 0),
    payment_method  TEXT CHECK (payment_method IN ('tunai', 'transfer', 'kartu_kredit', 'e_wallet', 'lainnya')),
    description     TEXT NOT NULL,
    transaction_date TEXT NOT NULL DEFAULT (date('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_org ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(organization_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);

-- ═══════════════════════════════════════════════════════════════
-- 11. STOCK_MOVEMENTS (Riwayat Perubahan Stok)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS stock_movements (
    id              TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    type            TEXT NOT NULL CHECK (type IN ('masuk', 'keluar', 'penyesuaian')),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    reference_type  TEXT CHECK (reference_type IN ('order', 'purchase', 'manual')),
    reference_id    TEXT,
    notes           TEXT,
    movement_date   TEXT NOT NULL DEFAULT (date('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(organization_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ═══════════════════════════════════════════════════════════════
-- Migration selesai
-- ═══════════════════════════════════════════════════════════════
