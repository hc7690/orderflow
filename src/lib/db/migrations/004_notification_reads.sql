-- ═══════════════════════════════════════════════════════════════
-- OrderFlow — Migration 004: Notification read tracking
-- ═══════════════════════════════════════════════════════════════
-- Notifications are computed dynamically from business data
-- (stock levels, order statuses, purchase statuses).
-- This table only tracks which notifications a user has read.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notification_reads (
    id              TEXT PRIMARY KEY NOT NULL,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_key TEXT NOT NULL,
    read_at         TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_key ON notification_reads(user_id, notification_key);
