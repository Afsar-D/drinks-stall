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
const adminPasscode = process.env.ADMIN_PASSCODE || '7860';

app.use(cors());
app.use(express.json());

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

const selectPaymentById = db.prepare('SELECT * FROM payments WHERE id = ?');
const selectPaymentsByStatus = db.prepare('SELECT * FROM payments WHERE status = ? ORDER BY rowid DESC');
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
  SET status = @status
  WHERE id = @id
`);

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
    approvedAt: row.approved_at
  };
}

function requireAdmin(req, res, next) {
  const code = req.header('x-admin-code');
  if (code !== adminPasscode) {
    return res.status(401).json({ message: 'Unauthorized admin request' });
  }
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
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
  if (code === adminPasscode) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, message: 'Invalid admin code' });
});

app.get('/api/admin/payments', requireAdmin, (req, res) => {
  const status = req.query.status;
  if (status !== 'pending' && status !== 'approved' && status !== 'cancelled') {
    return res.status(400).json({ message: 'status must be pending, approved, or cancelled' });
  }

  const rows = selectPaymentsByStatus.all(status);
  return res.json(rows.map(toResponseRow));
});

app.post('/api/admin/payments/:id/approve', requireAdmin, (req, res) => {
  const row = selectPaymentById.get(req.params.id);
  if (!row) {
    return res.status(404).json({ message: 'Payment request not found' });
  }

  if (row.status === 'approved') {
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
  return res.json(toResponseRow(approvedRow));
});

app.post('/api/admin/payments/:id/cancel', requireAdmin, (req, res) => {
  const row = selectPaymentById.get(req.params.id);
  if (!row) {
    return res.status(404).json({ message: 'Payment request not found' });
  }

  if (row.status === 'cancelled') {
    return res.status(200).json(toResponseRow(row));
  }

  if (row.status === 'approved') {
    return res.status(409).json({ message: 'Approved payment cannot be cancelled' });
  }

  cancelPayment.run({
    id: row.id,
    status: 'cancelled'
  });

  const cancelledRow = selectPaymentById.get(row.id);
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
