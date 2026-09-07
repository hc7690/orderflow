-- Add reference_id to notifications for linking to payments/orders
ALTER TABLE notifications ADD COLUMN reference_id TEXT DEFAULT NULL;

-- Add index for cleanup by reference
CREATE INDEX IF NOT EXISTS idx_notifications_ref ON notifications(reference_id);
