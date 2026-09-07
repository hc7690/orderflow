-- Fix notification priority for payment/order statuses that should be MEDIUM, not URGENT.
-- order_paid, payment_received, order_unpaid are informational — they do not require urgent action.
UPDATE notifications SET priority = 'medium'
WHERE type IN ('order_paid', 'payment_received', 'order_unpaid')
  AND priority != 'medium';