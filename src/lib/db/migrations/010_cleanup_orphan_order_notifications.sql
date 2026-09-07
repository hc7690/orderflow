-- Cleanup stale/orphan ORDER notifications based on the CURRENT database state.
-- Target: legacy testing rows that can no longer be reconciled with valid orders.
-- Rules applied (each DELETE is idempotent and safe to re-run):
--   1. 'undefined' text (unreconcilable legacy data)
--   2. reference_id pointing to a deleted order
--   3. order notifications for cancelled (dibatalkan) orders
--   4. order_new only valid while order status = 'draft'
--   5. order_processing only valid while status IN ('dikonfirmasi', 'diproses')
--   6. order_unpaid only valid while remaining balance > 0 (and not cancelled)
--   7. order_paid only valid while fully paid (and not cancelled)
--   8. payment_received only valid while the payment still exists
--   9. NULL-reference order notifications reconciled by order code in title:
--      deleted if orphaned (no matching order) or order is cancelled.
--  10. Unknown/legacy notification types (not produced by the current flow).
--  11. Legacy priority values outside the current system ('high', 'medium'),
--      e.g. old testing rows with 'urgent'.
-- Stock notifications are computed live and are NOT stored in this table, so they are untouched.

-- 1. Delete notifications with 'undefined' text (unreconcilable legacy rows)
DELETE FROM notifications WHERE title LIKE '%undefined%' OR message LIKE '%undefined%';

-- 2. Delete order-type notifications referencing orders that no longer exist
DELETE FROM notifications
WHERE type IN ('order_new', 'order_processing', 'order_unpaid', 'order_paid')
  AND reference_id IS NOT NULL
  AND reference_id NOT IN (SELECT id FROM orders);

-- 3. Delete order-type notifications for cancelled orders
DELETE FROM notifications
WHERE type IN ('order_new', 'order_processing', 'order_unpaid', 'order_paid')
  AND reference_id IS NOT NULL
  AND reference_id IN (SELECT id FROM orders WHERE status = 'dibatalkan');

-- 4. order_new only valid while order status = 'draft'
DELETE FROM notifications
WHERE type = 'order_new'
  AND reference_id IS NOT NULL
  AND reference_id IN (SELECT id FROM orders WHERE status != 'draft');

-- 5. order_processing only valid while status IN ('dikonfirmasi', 'diproses')
DELETE FROM notifications
WHERE type = 'order_processing'
  AND reference_id IS NOT NULL
  AND reference_id IN (SELECT id FROM orders WHERE status NOT IN ('dikonfirmasi', 'diproses'));

-- 6. order_unpaid valid while remaining > 0; delete if fully paid or cancelled
DELETE FROM notifications
WHERE type = 'order_unpaid'
  AND reference_id IS NOT NULL
  AND reference_id IN (
    SELECT o.id FROM orders o
    LEFT JOIN (
      SELECT order_id, SUM(amount) AS paid FROM order_payments GROUP BY order_id
    ) p ON p.order_id = o.id
    WHERE o.status = 'dibatalkan' OR o.total_amount - COALESCE(p.paid, 0) <= 0
  );

-- 7. order_paid valid while remaining <= 0; delete if not fully paid anymore or cancelled
DELETE FROM notifications
WHERE type = 'order_paid'
  AND reference_id IS NOT NULL
  AND reference_id IN (
    SELECT o.id FROM orders o
    LEFT JOIN (
      SELECT order_id, SUM(amount) AS paid FROM order_payments GROUP BY order_id
    ) p ON p.order_id = o.id
    WHERE o.status = 'dibatalkan' OR o.total_amount - COALESCE(p.paid, 0) > 0
  );

-- 8. payment_received valid only while the payment still exists
DELETE FROM notifications
WHERE type = 'payment_received'
  AND reference_id IS NOT NULL
  AND reference_id NOT IN (SELECT id FROM order_payments);

-- 9. NULL-reference order notifications: reconcile by order code in title.
--    Delete if orphaned (no matching order) or the matching order is cancelled.
DELETE FROM notifications
WHERE type IN ('order_new', 'order_processing', 'order_unpaid', 'order_paid')
  AND reference_id IS NULL
  AND (
    NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE instr(notifications.title, '—') > 0
        AND o.code = trim(substr(notifications.title, instr(notifications.title, '—') + 2))
    )
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE instr(notifications.title, '—') > 0
        AND o.code = trim(substr(notifications.title, instr(notifications.title, '—') + 2))
        AND o.status = 'dibatalkan'
    )
  );

-- 10. Delete unknown/legacy notification types not produced by the current flow
DELETE FROM notifications
WHERE type NOT IN ('order_new', 'order_processing', 'order_unpaid', 'order_paid', 'payment_received');

-- 11. Delete legacy priority values outside the current system ('high', 'medium')
DELETE FROM notifications WHERE priority NOT IN ('high', 'medium');