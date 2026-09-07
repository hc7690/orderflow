"use server";

/**
 * OrderFlow — Notification Server Actions
 *
 * Notification types:
 * - Stock (computed live): stock_empty, stock_low
 * - Order (stored in DB): order_new, order_processing, order_unpaid, order_paid
 * - Payment (stored in DB): payment_received
 *
 * Read/unread state persisted in notification_reads table.
 * All queries scoped to organization_id from server session.
 */

import { queryMany, queryOne, execute } from "@/lib/db";
import { getOrganizationId, requireAuth } from "@/lib/auth/server";
import { generateId } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────
export type NotificationPriority = "high" | "medium";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  href: string;
  createdAt: string;
  read: boolean;
}

// ─── Create Notification (used by other modules) ────────────────
export async function createNotification(params: {
  type: string;
  title: string;
  message: string;
  href: string;
  priority?: NotificationPriority;
  referenceId?: string; // link to payment/order for cleanup
  deduplicate?: boolean; // skip if same type+referenceId already exists
}): Promise<void> {
  const orgId = await getOrganizationId();

  // Dedup: skip if same type + reference_id already exists
  if (params.deduplicate && params.referenceId) {
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM notifications WHERE organization_id = ? AND type = ? AND reference_id = ?",
      [orgId, params.type, params.referenceId]
    );
    if (existing) return;
  }

  const id = generateId();
  await execute(
    `INSERT INTO notifications (id, organization_id, type, title, message, href, priority, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, orgId, params.type, params.title, params.message, params.href, params.priority || "medium", params.referenceId || null]
  );
}

// ─── Delete Notifications by reference_id ──────────────────────
export async function deleteNotificationsByRef(referenceId: string): Promise<void> {
  const orgId = await getOrganizationId();
  await execute(
    "DELETE FROM notifications WHERE organization_id = ? AND reference_id = ?",
    [orgId, referenceId]
  );
}

// ─── Delete Notifications by type + order_id (for stale cleanup)
export async function deleteNotificationsByTypeAndOrder(type: string, orderId: string): Promise<void> {
  const orgId = await getOrganizationId();
  // Match by href containing orderId or reference_id
  await execute(
    `DELETE FROM notifications WHERE organization_id = ? AND type = ? AND (reference_id = ? OR href LIKE ?)`,
    [orgId, type, orderId, `%order_id=${orderId}%`]
  );
}

// ─── Get All Notifications ──────────────────────────────────────
export async function getNotifications(): Promise<Notification[]> {
  const orgId = await getOrganizationId();
  const session = await requireAuth();
  const userId = session.userId;

  // Get read keys for this user
  const readKeys = await queryMany<{ notification_key: string }>(
    "SELECT notification_key FROM notification_reads WHERE user_id = ?",
    [userId]
  );
  const readSet = new Set(readKeys.map((r) => r.notification_key));

  const notifications: Notification[] = [];

  // ─── COMPUTED: Stock Empty (current_stock <= 0) ──────────────
  const emptyStock = await queryMany<{
    id: string; name: string; unit: string; current_stock: number; min_stock: number; updated_at: string;
  }>(
    `SELECT id, name, unit, current_stock, min_stock, updated_at
     FROM products
     WHERE organization_id = ? AND current_stock <= 0
     ORDER BY updated_at DESC`,
    [orgId]
  );

  for (const p of emptyStock) {
    const key = `stock_empty:${p.id}`;
    notifications.push({
      id: key,
      type: "stock_empty",
      title: `Stok Habis — ${p.name}`,
      message: `Stok tersisa ${p.current_stock} ${p.unit}, minimum ${p.min_stock} ${p.unit}.`,
      priority: "high",
      href: `/stok?highlight=${p.id}`,
      createdAt: p.updated_at,
      read: readSet.has(key),
    });
  }

  // ─── COMPUTED: Stock Low (0 < current_stock <= min_stock) ────
  const lowStock = await queryMany<{
    id: string; name: string; unit: string; current_stock: number; min_stock: number; updated_at: string;
  }>(
    `SELECT id, name, unit, current_stock, min_stock, updated_at
     FROM products
     WHERE organization_id = ? AND current_stock > 0 AND current_stock <= min_stock AND min_stock > 0
     ORDER BY current_stock ASC, updated_at DESC`,
    [orgId]
  );

  for (const p of lowStock) {
    const key = `stock_low:${p.id}`;
    notifications.push({
      id: key,
      type: "stock_low",
      title: `Stok Menipis — ${p.name}`,
      message: `Stok tersisa ${p.current_stock} ${p.unit}, minimum ${p.min_stock} ${p.unit}.`,
      priority: "medium",
      href: `/stok?highlight=${p.id}`,
      createdAt: p.updated_at,
      read: readSet.has(key),
    });
  }

  // ─── STORED: Order & Payment notifications ────────────────────
  // Hanya tampilkan notifikasi yang masih valid sesuai kondisi order/payment TERKINI:
  // - order_new        : order masih berstatus 'draft'
  // - order_processing : order berstatus 'dikonfirmasi' / 'diproses'
  // - order_unpaid     : order tidak dibatalkan DAN sisa pembayaran > 0
  // - order_paid       : order tidak dibatalkan DAN sudah lunas
  // - payment_received : payment terkait masih ada
  // Notifikasi lama/orphan (reference tidak valid, order dibatalkan, dll.) otomatis disembunyikan.
  const stored = await queryMany<{
    id: string; type: string; title: string; message: string; href: string; priority: string; created_at: string; reference_id: string | null;
  }>(
    `SELECT n.id, n.type, n.title, n.message, n.href, n.priority, n.created_at, n.reference_id
     FROM notifications n
     LEFT JOIN orders o ON n.reference_id = o.id
        AND n.type IN ('order_new', 'order_processing', 'order_unpaid', 'order_paid')
     LEFT JOIN order_payments op ON n.reference_id = op.id
        AND n.type = 'payment_received'
     LEFT JOIN (
        SELECT order_id, SUM(amount) AS paid
        FROM order_payments
        GROUP BY order_id
     ) p ON p.order_id = o.id
     WHERE n.organization_id = ?
       AND (
         (n.type = 'order_new' AND o.id IS NOT NULL AND o.status = 'draft')
         OR (n.type = 'order_processing' AND o.id IS NOT NULL AND o.status IN ('dikonfirmasi', 'diproses'))
         OR (n.type = 'order_unpaid' AND o.id IS NOT NULL AND o.status != 'dibatalkan' AND o.total_amount - COALESCE(p.paid, 0) > 0)
         OR (n.type = 'order_paid' AND o.id IS NOT NULL AND o.status != 'dibatalkan' AND o.total_amount - COALESCE(p.paid, 0) <= 0)
         OR (n.type = 'payment_received' AND op.id IS NOT NULL)
       )
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [orgId]
  );

  for (const n of stored) {
    // Normalize priority: certain types MUST be medium regardless of stored value.
    // This fixes legacy rows that were saved with the wrong priority.
    const rawPriority = (n.priority as NotificationPriority) || "medium";
    const needsMedium =
      n.type === "order_paid" ||
      n.type === "payment_received" ||
      n.type === "order_unpaid" ||
    n.type === "order_processing";
    notifications.push({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      priority: needsMedium ? "medium" : rawPriority,
      href: n.href,
      createdAt: n.created_at,
      read: readSet.has(n.id),
    });
  }

  // Sort: unread first, then high priority, then newest
  notifications.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return notifications;
}

// ─── Get Unread Count ───────────────────────────────────────────
export async function getUnreadCount(): Promise<number> {
  const notifications = await getNotifications();
  return notifications.filter((n) => !n.read).length;
}

// ─── Mark Single Notification as Read ───────────────────────────
export async function markNotificationRead(notificationKey: string): Promise<void> {
  const session = await requireAuth();
  const userId = session.userId;

  await execute(
    `INSERT OR IGNORE INTO notification_reads (id, user_id, notification_key, read_at)
     VALUES (?, ?, ?, datetime('now'))`,
    [generateId(), userId, notificationKey]
  );
}

// ─── Mark All Notifications as Read ─────────────────────────────
export async function markAllNotificationsRead(): Promise<void> {
  const session = await requireAuth();
  const userId = session.userId;

  const notifications = await getNotifications();
  const unreadKeys = notifications.filter((n) => !n.read).map((n) => n.id);

  for (const key of unreadKeys) {
    await execute(
      `INSERT OR IGNORE INTO notification_reads (id, user_id, notification_key, read_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [generateId(), userId, key]
    );
  }
}
