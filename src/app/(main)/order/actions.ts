"use server";

/**
 * OrderFlow — Order Server Actions
 *
 * Server actions untuk operasi CRUD order masuk dari customer.
 */

import { queryMany, queryOne, execute } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";
import { generateId, formatRupiah } from "@/lib/utils";
import { createNotification, deleteNotificationsByRef, deleteNotificationsByTypeAndOrder } from "@/app/api/notifications/actions";

// ─── Tipe Data ─────────────────────────────────────────────────
export interface Order {
  id: string;
  organization_id: string;
  customer_id: string;
  code: string;
  status: "draft" | "dikonfirmasi" | "diproses" | "selesai" | "dibatalkan";
  total_amount: number;
  discount: number;
  notes: string | null;
  order_date: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
  customer_code?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface CreateOrderInput {
  customer_id: string;
  discount?: number;
  notes?: string;
  order_date?: string;
  items: {
    product_id: string;
    product_code: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
}

export interface UpdateOrderInput {
  id: string;
  status?: Order["status"];
  discount?: number;
  notes?: string;
}

export interface OrderPayment {
  id: string;
  organization_id: string;
  order_id: string;
  amount: number;
  payment_method: string | null;
  description: string | null;
  payment_date: string;
  created_at: string;
}

export interface OrderPaymentSummary {
  totalOrder: number;
  totalPaid: number;
  remaining: number;
  paymentStatus: "belum_bayar" | "dp" | "lunas";
  payments: OrderPayment[];
}

export interface RecordPaymentInput {
  order_id: string;
  amount: number;
  payment_method?: string;
  description?: string;
  payment_date?: string;
}

// ─── Get All Orders ────────────────────────────────────────────
export async function getOrders(search?: string, status?: string): Promise<Order[]> {
  const orgId = await getOrganizationId();

  let sql = `
    SELECT o.*, c.name as customer_name, c.code as customer_code
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.organization_id = ?
  `;
  const args: (string | number)[] = [orgId];

  if (search) {
    sql += " AND (o.code LIKE ? OR c.name LIKE ?)";
    const searchPattern = `%${search}%`;
    args.push(searchPattern, searchPattern);
  }

  if (status) {
    sql += " AND o.status = ?";
    args.push(status);
  }

  sql += " ORDER BY o.created_at DESC";

  return queryMany<Order>(sql, args);
}

// ─── Get Order by ID ──────────────────────────────────────────
export async function getOrder(id: string): Promise<Order | null> {
  const orgId = await getOrganizationId();

  return queryOne<Order>(
    `SELECT o.*, c.name as customer_name, c.code as customer_code
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     WHERE o.id = ? AND o.organization_id = ?`,
    [id, orgId]
  );
}

// ─── Get Order Items ──────────────────────────────────────────
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const orgId = await getOrganizationId();

  // Verify order belongs to this organization
  const order = await queryOne(
    "SELECT id FROM orders WHERE id = ? AND organization_id = ?",
    [orderId, orgId]
  );

  if (!order) {
    throw new Error("Order tidak ditemukan");
  }

  return queryMany<OrderItem>(
    "SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at",
    [orderId]
  );
}

// ─── Generate Next Order Code ──────────────────────────────────
async function getNextOrderCode(orgId: string): Promise<string> {
  const lastOrder = await queryOne<{ code: string }>(
    "SELECT code FROM orders WHERE organization_id = ? ORDER BY created_at DESC LIMIT 1",
    [orgId]
  );

  if (!lastOrder) {
    return "ORD-0001";
  }

  const lastNum = parseInt(lastOrder.code.split("-")[1], 10);
  const nextNum = (lastNum || 0) + 1;
  return `ORD-${String(nextNum).padStart(4, "0")}`;
}

// ─── Create Order ──────────────────────────────────────────────
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const orgId = await getOrganizationId();
  const id = generateId();
  const code = await getNextOrderCode(orgId);

  // Validate customer exists
  const customer = await queryOne(
    "SELECT id, name FROM customers WHERE id = ? AND organization_id = ?",
    [input.customer_id, orgId]
  );
  if (!customer) {
    throw new Error("Customer tidak ditemukan");
  }

  // Validate items
  if (!input.items || input.items.length === 0) {
    throw new Error("Order harus memiliki minimal 1 item");
  }

  // Calculate total
  let totalAmount = 0;
  for (const item of input.items) {
    totalAmount += item.quantity * item.unit_price;
  }

  const discount = input.discount ?? 0;
  const finalAmount = totalAmount - discount;

  if (finalAmount < 0) {
    throw new Error("Diskon tidak boleh melebihi total harga");
  }

  // Insert order
  await execute(
    `INSERT INTO orders (id, organization_id, customer_id, code, status, total_amount, discount, notes, order_date)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
    [
      id,
      orgId,
      input.customer_id,
      code,
      finalAmount,
      discount,
      input.notes || null,
      input.order_date || new Date().toISOString().split("T")[0],
    ]
  );

  // Insert order items
  for (const item of input.items) {
    const itemId = generateId();
    const subtotal = item.quantity * item.unit_price;
    await execute(
      `INSERT INTO order_items (id, order_id, product_id, product_code, product_name, quantity, unit_price, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        id,
        item.product_id,
        item.product_code,
        item.product_name,
        item.quantity,
        item.unit_price,
        subtotal,
      ]
    );
  }

  // Create notification: Order Baru
  await createNotification({
    type: "order_new",
    title: `Order Baru — ${code}`,
    message: `${customer?.name || "Customer tidak diketahui"} — ${formatRupiah(finalAmount)}`,
    href: "/order",
    priority: "medium",
    referenceId: id,
  }).catch(() => {});

  return getOrder(id) as Promise<Order>;
}

// ─── Update Order Status ──────────────────────────────────────
export async function updateOrderStatus(
  id: string,
  status: Order["status"]
): Promise<Order> {
  const orgId = await getOrganizationId();

  // Validate order exists (JOIN customers for name)
  const order = await queryOne<Order>(
    `SELECT o.*, c.name as customer_name, c.code as customer_code
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     WHERE o.id = ? AND o.organization_id = ?`,
    [id, orgId]
  );
  if (!order) {
    throw new Error("Order tidak ditemukan");
  }

  // Validate: cannot change to same status
  if (order.status === status) {
    throw new Error(`Status sudah "${status}", tidak perlu diubah`);
  }

  // Validate: cannot change from terminal states
  if (order.status === "selesai" || order.status === "dibatalkan") {
    throw new Error(`Order dengan status "${order.status}" tidak dapat diubah lagi`);
  }

  // If completing order, update stock
  if (status === "selesai") {
    const items = await getOrderItems(id);
    for (const item of items) {
      // Get current stock
      const product = await queryOne<{ current_stock: number }>(
        "SELECT current_stock FROM products WHERE id = ?",
        [item.product_id]
      );

      if (!product) {
        throw new Error(`Produk ${item.product_name} tidak ditemukan`);
      }

      if (product.current_stock < item.quantity) {
        throw new Error(
          `Stok ${item.product_name} tidak mencukupi. Stok: ${product.current_stock}, Dibutuhkan: ${item.quantity}`
        );
      }

      // Deduct stock
      await execute(
        "UPDATE products SET current_stock = current_stock - ?, updated_at = datetime('now') WHERE id = ?",
        [item.quantity, item.product_id]
      );

      // Record stock movement
      const movementId = generateId();
      await execute(
        `INSERT INTO stock_movements (id, organization_id, product_id, type, quantity, reference_type, reference_id, notes)
         VALUES (?, ?, ?, 'keluar', ?, 'order', ?, ?)`,
        [
          movementId,
          orgId,
          item.product_id,
          item.quantity,
          id,
          `Order ${order.code} selesai`,
        ]
      );
    }
  }

  // Update status
  await execute(
    "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ? AND organization_id = ?",
    [status, id, orgId]
  );

  // ─── Clean stale order notifications for this order ───
  // Remove order_new when status changes (no longer "new")
  await deleteNotificationsByTypeAndOrder("order_new", order.id).catch(() => {});
  // Remove old order_processing notif when status updates again
  await deleteNotificationsByTypeAndOrder("order_processing", order.id).catch(() => {});
  // Remove unpaid/paid notifs on status change (will be recalculated if needed)
  await deleteNotificationsByTypeAndOrder("order_unpaid", order.id).catch(() => {});

  // Create notification based on new status
  const customerName = order.customer_name || "Customer tidak diketahui";
  if (status === "dikonfirmasi" || status === "diproses") {
    const label = status === "dikonfirmasi" ? "Dikonfirmasi" : "Perlu Diproses";
    await createNotification({
      type: "order_processing",
      title: `Order ${label} — ${order.code}`,
      message: `${customerName} — ${formatRupiah(order.total_amount)}`,
      href: "/order",
      priority: "medium",
      referenceId: order.id,
    }).catch(() => {});
  }

  // If completed or cancelled, ensure no stale payment-related notifs remain
  if (status === "selesai" || status === "dibatalkan") {
    await deleteNotificationsByTypeAndOrder("order_unpaid", order.id).catch(() => {});
    await deleteNotificationsByTypeAndOrder("order_paid", order.id).catch(() => {});
    await deleteNotificationsByTypeAndOrder("payment_received", order.id).catch(() => {});
  }

  return getOrder(id) as Promise<Order>;
}

// ─── Delete Order ──────────────────────────────────────────────
export async function deleteOrder(id: string): Promise<void> {
  const orgId = await getOrganizationId();

  // Only allow deleting draft orders
  const order = await queryOne<Order>(
    "SELECT * FROM orders WHERE id = ? AND organization_id = ?",
    [id, orgId]
  );
  if (!order) {
    throw new Error("Order tidak ditemukan");
  }

  if (order.status !== "draft") {
    throw new Error("Hanya order dengan status draft yang dapat dihapus");
  }

  // Delete order items first
  await execute("DELETE FROM order_items WHERE order_id = ?", [id]);

  // Delete order
  await execute("DELETE FROM orders WHERE id = ? AND organization_id = ?", [
    id,
    orgId,
  ]);
}

// ─── Sync missing transactions for order payments ───────────
async function syncPaymentTransactions(orderId: string, orgId: string): Promise<void> {
  // Find payments that don't have a corresponding pemasukan transaction yet
  const unsynced = await queryMany<OrderPayment & { order_code: string }>(
    `SELECT op.*, o.code as order_code
     FROM order_payments op
     JOIN orders o ON op.order_id = o.id
     WHERE op.order_id = ? AND op.organization_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.organization_id = op.organization_id
           AND t.type = 'pemasukan'
           AND t.reference_type = 'order'
           AND t.reference_id = op.order_id
           AND t.description LIKE '%Pembayaran ' || o.code || '%'
           AND CAST(t.amount AS INTEGER) = CAST(op.amount AS INTEGER)
           AND t.transaction_date = op.payment_date
       )`,
    [orderId, orgId]
  );

  for (const p of unsynced) {
    const txId = generateId();
    const txDescription = `Pembayaran ${p.order_code}`;
    await execute(
      `INSERT INTO transactions (id, organization_id, type, reference_type, reference_id, amount, payment_method, description, transaction_date)
       VALUES (?, ?, 'pemasukan', 'order', ?, ?, ?, ?, ?)`,
      [
        txId,
        orgId,
        orderId,
        p.amount,
        p.payment_method || null,
        txDescription,
        p.payment_date,
      ]
    );
  }
}

// ─── Get Order Payment Summary ────────────────────────────────
export async function getOrderPaymentSummary(orderId: string): Promise<OrderPaymentSummary> {
  const orgId = await getOrganizationId();

  const order = await queryOne<Order>(
    `SELECT o.*, c.name as customer_name, c.code as customer_code
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     WHERE o.id = ? AND o.organization_id = ?`,
    [orderId, orgId]
  );
  if (!order) throw new Error("Order tidak ditemukan");

  // Sync any missing transactions for existing payments
  await syncPaymentTransactions(orderId, orgId);

  const totalOrder = order.total_amount;

  const paidResult = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM order_payments WHERE order_id = ? AND organization_id = ?",
    [orderId, orgId]
  );
  const totalPaid = paidResult?.total ?? 0;
  const remaining = totalOrder - totalPaid;

  let paymentStatus: "belum_bayar" | "dp" | "lunas" = "belum_bayar";
  if (totalPaid >= totalOrder) paymentStatus = "lunas";
  else if (totalPaid > 0) paymentStatus = "dp";

  const payments = await queryMany<OrderPayment>(
    "SELECT * FROM order_payments WHERE order_id = ? AND organization_id = ? ORDER BY payment_date DESC, created_at DESC",
    [orderId, orgId]
  );

  return { totalOrder, totalPaid, remaining, paymentStatus, payments };
}

// ─── Record Payment ────────────────────────────────────────────
export async function recordPayment(input: RecordPaymentInput): Promise<OrderPaymentSummary> {
  const orgId = await getOrganizationId();
  const id = generateId();

  const order = await queryOne<Order>(
    `SELECT o.*, c.name as customer_name, c.code as customer_code
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     WHERE o.id = ? AND o.organization_id = ?`,
    [input.order_id, orgId]
  );
  if (!order) throw new Error("Order tidak ditemukan");

  // Calculate current total paid
  const paidResult = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM order_payments WHERE order_id = ? AND organization_id = ?",
    [input.order_id, orgId]
  );
  const currentPaid = paidResult?.total ?? 0;
  const remaining = order.total_amount - currentPaid;

  if (input.amount <= 0) {
    throw new Error("Jumlah pembayaran harus lebih dari 0");
  }

  if (input.amount > remaining) {
    throw new Error(`Jumlah pembayaran melebihi sisa. Sisa: ${remaining}`);
  }

  // Save payment
  await execute(
    `INSERT INTO order_payments (id, organization_id, order_id, amount, payment_method, description, payment_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      orgId,
      input.order_id,
      input.amount,
      input.payment_method || null,
      input.description || null,
      input.payment_date || new Date().toISOString().split("T")[0],
    ]
  );

  // Auto-create pemasukan transaction
  const txId = generateId();
  const txDescription = `Pembayaran ${order.code}${input.description ? ` - ${input.description}` : ""}`;
  await execute(
    `INSERT INTO transactions (id, organization_id, type, reference_type, reference_id, amount, payment_method, description, transaction_date)
     VALUES (?, ?, 'pemasukan', 'order', ?, ?, ?, ?, ?)`,
    [
      txId,
      orgId,
      order.id,
      input.amount,
      input.payment_method || null,
      txDescription,
      input.payment_date || new Date().toISOString().split("T")[0],
    ]
  );

  // Check new payment status after this payment
  const newTotalPaid = currentPaid + input.amount;
  const isLunas = newTotalPaid >= order.total_amount;

  const customerName = order.customer_name || "Customer tidak diketahui";

  // Clean ALL stale order-related notifs for this order
  await deleteNotificationsByTypeAndOrder("order_unpaid", order.id).catch(() => {});
  await deleteNotificationsByTypeAndOrder("order_paid", order.id).catch(() => {});
  await deleteNotificationsByTypeAndOrder("payment_received", order.id).catch(() => {});

  if (isLunas) {
    // Final payment — only create "Pembayaran Lunas", no "Pembayaran Masuk"
    await createNotification({
      type: "order_paid",
      title: `Pembayaran Lunas — ${order.code}`,
      message: `${customerName} — Total ${formatRupiah(order.total_amount)}`,
      href: "/order",
      priority: "medium",
      referenceId: order.id,
    }).catch(() => {});
  } else {
    // Partial payment — "Pembayaran Masuk" with sisa info
    const remainingAfter = order.total_amount - newTotalPaid;
    await createNotification({
      type: "payment_received",
      title: `Pembayaran Masuk — ${order.code}`,
      message: `${formatRupiah(input.amount)} dari ${customerName} — Sisa ${formatRupiah(remainingAfter)}`,
      href: "/order",
      priority: "medium",
      referenceId: order.id,
      deduplicate: true,
    }).catch(() => {});

    // Maintain "Order Belum Lunas" with updated remaining
    await createNotification({
      type: "order_unpaid",
      title: `Order Belum Lunas — ${order.code}`,
      message: `${customerName} — Sisa ${formatRupiah(remainingAfter)}`,
      href: "/order",
      priority: "medium",
      referenceId: order.id,
    }).catch(() => {});
  }

  return getOrderPaymentSummary(input.order_id);
}

// ─── Delete Order Payment ─────────────────────────────────────
export async function deleteOrderPayment(paymentId: string): Promise<OrderPaymentSummary> {
  const orgId = await getOrganizationId();

  // Find the payment
  const payment = await queryOne<OrderPayment>(
    "SELECT * FROM order_payments WHERE id = ? AND organization_id = ?",
    [paymentId, orgId]
  );
  if (!payment) throw new Error("Pembayaran tidak ditemukan");

  const order = await queryOne<Order>(
    `SELECT o.*, c.name as customer_name, c.code as customer_code
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     WHERE o.id = ? AND o.organization_id = ?`,
    [payment.order_id, orgId]
  );
  if (!order) throw new Error("Order tidak ditemukan");

  // Find and delete the corresponding pemasukan transaction
  // Match by: type=pemasukan, reference_type=order, reference_id=order_id, amount=payment amount, same date
  const tx = await queryOne<{ id: string }>(
    `SELECT id FROM transactions
     WHERE organization_id = ?
       AND type = 'pemasukan'
       AND reference_type = 'order'
       AND reference_id = ?
       AND CAST(amount AS INTEGER) = CAST(? AS INTEGER)
       AND transaction_date = ?`,
    [orgId, order.id, payment.amount, payment.payment_date]
  );

  if (tx) {
    await execute("DELETE FROM transactions WHERE id = ? AND organization_id = ?", [tx.id, orgId]);
  }

  // Delete the payment
  await execute("DELETE FROM order_payments WHERE id = ? AND organization_id = ?", [paymentId, orgId]);

  // Delete notification for this specific payment
  await deleteNotificationsByRef(paymentId).catch(() => {});

  // Clean stale order_unpaid/order_paid notifs for this order
  await deleteNotificationsByTypeAndOrder("order_unpaid", order.id).catch(() => {});
  await deleteNotificationsByTypeAndOrder("order_paid", order.id).catch(() => {});

  // Recalculate and create appropriate notification
  const paidAfterDelete = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM order_payments WHERE order_id = ? AND organization_id = ?",
    [payment.order_id, orgId]
  );
  const remainingAfterDelete = order.total_amount - (paidAfterDelete?.total ?? 0);
  const customerName = order.customer_name || "Customer tidak diketahui";

  if (remainingAfterDelete > 0 && order.status === "selesai") {
    await createNotification({
      type: "order_unpaid",
      title: `Order Belum Lunas — ${order.code}`,
      message: `${customerName} — Sisa ${formatRupiah(remainingAfterDelete)}`,
      href: "/order",
      priority: "medium",
      referenceId: order.id,
    }).catch(() => {});
  } else if (remainingAfterDelete <= 0) {
    await createNotification({
      type: "order_paid",
      title: `Pembayaran Lunas — ${order.code}`,
      message: `${customerName} — ${formatRupiah(order.total_amount)}`,
      href: "/order",
      priority: "medium",
      referenceId: order.id,
    }).catch(() => {});
  }

  // Return updated summary
  return getOrderPaymentSummary(payment.order_id);
}

// ─── Get Order Stats ──────────────────────────────────────────
export async function getOrderStats() {
  const orgId = await getOrganizationId();

  // Semua statistik digabung menjadi 1 query agar mengurangi
  // round-trip ke database Turso.
  const stats = await queryOne<{
    total: number;
    draft: number;
    inProgress: number;
    completed: number;
    totalRevenue: number;
  }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
       SUM(CASE WHEN status IN ('dikonfirmasi', 'diproses') THEN 1 ELSE 0 END) AS inProgress,
       SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) AS completed,
       COALESCE(SUM(CASE WHEN status = 'selesai' THEN total_amount ELSE 0 END), 0) AS totalRevenue
     FROM orders
     WHERE organization_id = ?`,
    [orgId]
  );

  return {
    total: stats?.total ?? 0,
    draft: stats?.draft ?? 0,
    inProgress: stats?.inProgress ?? 0,
    completed: stats?.completed ?? 0,
    totalRevenue: stats?.totalRevenue ?? 0,
  };
}
