import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;
const host = process.env.HOST || '0.0.0.0';
const adminPasscode = process.env.ADMIN_PASSCODE;
const startedAt = Date.now();

app.use(cors());
app.use(express.json());

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

const selectPaymentById = db.prepare('SELECT * FROM payments WHERE id = ?');
const selectPaymentsByStatus = db.prepare('SELECT * FROM payments WHERE status = ? ORDER BY rowid DESC');
const selectPaymentsByStatusWithSearch = db.prepare(`
  SELECT *
  FROM payments
  WHERE status = @status
    AND (LOWER(id) LIKE @search OR LOWER(customer_name) LIKE @search)
  ORDER BY rowid DESC
`);
const selectAllPayments = db.prepare('SELECT * FROM payments ORDER BY rowid DESC');
const selectSummaryCounts = db.prepare(`
  SELECT
    COUNT(*) AS total_requests,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
    SUM(CASE WHEN status = 'approved' THEN total ELSE 0 END) AS approved_total
  FROM payments
`);
const insertPayment = db.prepare(`
  INSERT INTO payments (id, customer_name, items_json, total, created_at, status)
  VALUES (@id, @customer_name, @items_json, @total, @created_at, @status)
`);
const approvePayment = db.prepare(`
  UPDATE payments
  SET status = @status, order_id = @order_id, order_date = @order_date, approved_at = @approved_at
  WHERE id = @id
`);
const cancelPayment = db.prepare(`
  UPDATE payments
  SET status = @status, cancel_reason = @cancel_reason, cancelled_at = @cancelled_at
  WHERE id = @id
`);
const insertAuditLog = db.prepare(`
  INSERT INTO payment_audit_logs (payment_id, action, actor, note, created_at)
  VALUES (@payment_id, @action, @actor, @note, @created_at)
`);
const selectRecentAuditLogs = db.prepare(`
  SELECT id, payment_id, action, actor, note, created_at
  FROM payment_audit_logs
  ORDER BY id DESC
  LIMIT @limit
`);

function nowIST() {
  return new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function flattenItems(items) {
  return items.map((item) => `${item.quantity}x ${item.name}`).join('; ');
}

function toResponseRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    items: JSON.parse(row.items_json),
    total: row.total,
    createdAt: row.created_at,
    status: row.status,
    orderId: row.order_id,
    orderDate: row.order_date,
    approvedAt: row.approved_at,
    cancelReason: row.cancel_reason,
    cancelledAt: row.cancelled_at
  };
}

function requireAdmin(req, res, next) {
  if (!adminPasscode) {
    return res.status(500).json({ message: 'Admin passcode is not configured' });
  }

  const code = req.header('x-admin-code');
  if (code !== adminPasscode) {
    return res.status(401).json({ message: 'Unauthorized admin request' });
  }
  next();
}

app.get('/api/health', (_req, res) => {
  let dbOk = true;
  try {
    db.prepare('SELECT 1').get();
  } catch {
    dbOk = false;
  }

  res.json({
    ok: true,
    dbOk,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    environment: process.env.NODE_ENV || 'development',
    hasAdminPasscode: Boolean(process.env.ADMIN_PASSCODE),
    hasDbPath: Boolean(process.env.DB_PATH),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/payments/request', (req, res) => {
  const { customerName, items, total } = req.body;
  if (!customerName || !Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
    return res.status(400).json({ message: 'Invalid payment request payload' });
  }

  const id = `PAY-${Date.now().toString().slice(-6)}`;
  const createdAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  insertPayment.run({
    id,
    customer_name: customerName.trim(),
    items_json: JSON.stringify(items),
    total,
    created_at: createdAt,
    status: 'pending'
  });

  return res.status(201).json({
    requestId: id,
    status: 'pending'
  });
});

app.get('/api/payments/:id', (req, res) => {
  const row = selectPaymentById.get(req.params.id);
  if (!row) {
    return res.status(404).json({ message: 'Payment request not found' });
  }
  return res.json(toResponseRow(row));
});

app.post('/api/admin/login', (req, res) => {
  const { code } = req.body;
  if (!adminPasscode) {
    return res.status(500).json({ ok: false, message: 'Admin passcode is not configured' });
  }

  if (code === adminPasscode) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, message: 'Invalid admin code' });
});

app.get('/api/admin/payments', requireAdmin, (req, res) => {
  const status = req.query.status;
  const search = String(req.query.search || '').trim().toLowerCase();

  if (status !== 'pending' && status !== 'approved' && status !== 'cancelled') {
    return res.status(400).json({ message: 'status must be pending, approved, or cancelled' });
  }

  const rows = search
    ? selectPaymentsByStatusWithSearch.all({ status, search: `%${search}%` })
    : selectPaymentsByStatus.all(status);
  return res.json(rows.map(toResponseRow));
});

app.get('/api/admin/summary', requireAdmin, (_req, res) => {
  const row = selectSummaryCounts.get();
  return res.json({
    totalRequests: row.total_requests || 0,
    pendingCount: row.pending_count || 0,
    approvedCount: row.approved_count || 0,
    cancelledCount: row.cancelled_count || 0,
    approvedTotal: Number(row.approved_total || 0).toFixed(2)
  });
});

app.get('/api/admin/audit', requireAdmin, (req, res) => {
  const limitRaw = Number(req.query.limit || 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 50;
  const rows = selectRecentAuditLogs.all({ limit });
  return res.json(rows.map((row) => ({
    id: row.id,
    paymentId: row.payment_id,
    action: row.action,
    actor: row.actor,
    note: row.note,
    createdAt: row.created_at
  })));
});

app.get('/api/admin/export/payments.csv', requireAdmin, (_req, res) => {
  const rows = selectAllPayments.all().map(toResponseRow);
  const header = [
    'request_id',
    'customer_name',
    'total',
    'status',
    'created_at',
    'invoice_id',
    'approved_at',
    'cancelled_at',
    'cancel_reason',
    'items'
  ];

  const csv = [
    header.join(','),
    ...rows.map((payment) => [
      payment.id,
      payment.customerName,
      Number(payment.total).toFixed(2),
      payment.status,
      payment.createdAt,
      payment.orderId || '',
      payment.approvedAt || '',
      payment.cancelledAt || '',
      payment.cancelReason || '',
      flattenItems(payment.items)
    ].map(csvEscape).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="payments-backup-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(csv);
});

app.post('/api/admin/payments/:id/approve', requireAdmin, (req, res) => {
  const row = selectPaymentById.get(req.params.id);
  if (!row) {
    return res.status(404).json({ message: 'Payment request not found' });
  }

  if (row.status === 'approved') {
    insertAuditLog.run({
      payment_id: row.id,
      action: 'approve_idempotent',
      actor: 'admin',
      note: 'Approve called on already approved request',
      created_at: nowIST()
    });
    return res.status(200).json(toResponseRow(row));
  }

  if (row.status === 'cancelled') {
    return res.status(409).json({ message: 'Cancelled payment cannot be approved' });
  }

  const orderId = `INV-${Math.floor(10000 + Math.random() * 90000)}`;
  const orderDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  approvePayment.run({
    id: row.id,
    status: 'approved',
    order_id: orderId,
    order_date: orderDate,
    approved_at: orderDate
  });

  const approvedRow = selectPaymentById.get(row.id);
  insertAuditLog.run({
    payment_id: row.id,
    action: 'approved',
    actor: 'admin',
    note: `Invoice ${approvedRow.order_id}`,
    created_at: nowIST()
  });
  return res.json(toResponseRow(approvedRow));
});

app.post('/api/admin/payments/:id/cancel', requireAdmin, (req, res) => {
  const reason = String(req.body?.reason || '').trim();
  const row = selectPaymentById.get(req.params.id);
  if (!row) {
    return res.status(404).json({ message: 'Payment request not found' });
  }

  if (!reason) {
    return res.status(400).json({ message: 'Cancellation reason is required' });
  }

  if (row.status === 'cancelled') {
    insertAuditLog.run({
      payment_id: row.id,
      action: 'cancel_idempotent',
      actor: 'admin',
      note: `Repeated cancel request. Reason: ${reason}`,
      created_at: nowIST()
    });
    return res.status(200).json(toResponseRow(row));
  }

  if (row.status === 'approved') {
    return res.status(409).json({ message: 'Approved payment cannot be cancelled' });
  }

  cancelPayment.run({
    id: row.id,
    status: 'cancelled',
    cancel_reason: reason,
    cancelled_at: nowIST()
  });

  const cancelledRow = selectPaymentById.get(row.id);
  insertAuditLog.run({
    payment_id: row.id,
    action: 'cancelled',
    actor: 'admin',
    note: reason,
    created_at: nowIST()
  });
  return res.json(toResponseRow(cancelledRow));
});

// SPA fallback — must be after all API routes
if (process.env.NODE_ENV === 'production') {
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`API running on http://${host}:${port}`);
});
