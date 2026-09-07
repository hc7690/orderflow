-- Order Payments table for recording payments against orders
CREATE TABLE IF NOT EXISTS order_payments (
    id              TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount          INTEGER NOT NULL CHECK (amount > 0),
    payment_method  TEXT,
    description     TEXT,
    payment_date    TEXT NOT NULL DEFAULT (date('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_org ON order_payments(organization_id);
