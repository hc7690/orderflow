-- Cleanup stale/duplicate/undefined notifications from testing period
-- This migration removes: undefined text, duplicates, orphaned refs

-- 1. Delete notifications with "undefined" in title or message
DELETE FROM notifications WHERE title LIKE '%undefined%' OR message LIKE '%undefined%';

-- 2. Delete duplicate payment_received notifications (keep only newest per reference_id)
DELETE FROM notifications
WHERE id NOT IN (
  SELECT MAX(id) FROM notifications
  WHERE type = 'payment_received' AND reference_id IS NOT NULL
  GROUP BY type, reference_id
)
AND type = 'payment_received' AND reference_id IS NOT NULL;

-- 3. Delete orphaned order_unpaid/order_paid notifications (reference_id points to non-existent order)
DELETE FROM notifications
WHERE type IN ('order_unpaid', 'order_paid')
  AND reference_id IS NOT NULL
  AND reference_id NOT IN (SELECT id FROM orders);

-- 4. Delete orphaned payment_received notifications (reference_id points to non-existent payment)
DELETE FROM notifications
WHERE type = 'payment_received'
  AND reference_id IS NOT NULL
  AND reference_id NOT IN (SELECT id FROM order_payments);

-- 5. Delete duplicate order_unpaid notifications (keep only newest per order)
DELETE FROM notifications
WHERE id NOT IN (
  SELECT MAX(id) FROM notifications
  WHERE type = 'order_unpaid' AND reference_id IS NOT NULL
  GROUP BY type, reference_id
)
AND type = 'order_unpaid' AND reference_id IS NOT NULL;

-- 6. Delete duplicate order_paid notifications (keep only newest per order)
DELETE FROM notifications
WHERE id NOT IN (
  SELECT MAX(id) FROM notifications
  WHERE type = 'order_paid' AND reference_id IS NOT NULL
  GROUP BY type, reference_id
)
AND type = 'order_paid' AND reference_id IS NOT NULL;
