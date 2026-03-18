import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'stall.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    items_json TEXT NOT NULL,
    total REAL NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL,
    order_id TEXT,
    order_date TEXT,
    approved_at TEXT,
    cancel_reason TEXT,
    cancelled_at TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );
`);

const paymentColumns = db.prepare('PRAGMA table_info(payments)').all();
const hasCancelReasonColumn = paymentColumns.some((column) => column.name === 'cancel_reason');
const hasCancelledAtColumn = paymentColumns.some((column) => column.name === 'cancelled_at');

if (!hasCancelReasonColumn) {
  db.exec('ALTER TABLE payments ADD COLUMN cancel_reason TEXT');
}

if (!hasCancelledAtColumn) {
  db.exec('ALTER TABLE payments ADD COLUMN cancelled_at TEXT');
}

export default db;
