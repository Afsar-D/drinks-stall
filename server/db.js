import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, 'stall.db');
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
    approved_at TEXT
  );
`);

export default db;
