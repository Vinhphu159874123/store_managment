import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import path from 'path'
import fs from 'fs'

let sqlDb: SqlJsDatabase | null = null
let dbPath: string = ''
let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Trả về thư mục gốc lưu dữ liệu:
 *  - Dev:        <project_root>/data/
 *  - Production: AppData/Roaming/shop-management/
 */
function getDataDir(): string {
  const dir = is.dev
    ? path.join(app.getAppPath(), 'data')
    : app.getPath('userData')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getDbPath(): string {
  return path.join(getDataDir(), 'shop-management.db')
}

export function getBackupDir(): string {
  const backupDir = path.join(getDataDir(), 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  return backupDir
}

export async function initDatabase(): Promise<void> {
  if (sqlDb) return

  dbPath = getDbPath()
  console.log('[DB] Database path:', dbPath)

  // Initialize sql.js
  const SQL = await initSqlJs()

  // Load existing database or create new
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    sqlDb = new SQL.Database(fileBuffer)
    console.log('[DB] Loaded existing database')
  } else {
    sqlDb = new SQL.Database()
    console.log('[DB] Created new database')
  }

  // Enable foreign keys
  sqlDb.run('PRAGMA foreign_keys = ON;')

  // Create tables
  createTables(sqlDb)

  // Migration: add cost_price_snapshot if it doesn't exist
  try {
    sqlDb.run('ALTER TABLE invoice_items ADD COLUMN cost_price_snapshot REAL NOT NULL DEFAULT 0;')
    console.log('[DB] Migration: Added cost_price_snapshot to invoice_items')
  } catch (err) {
    // Column might already exist, ignore error
  }

  // Migration: backfill cost_price_snapshot for historical invoice items
  try {
    const res = sqlDb.run(`
      UPDATE invoice_items 
      SET cost_price_snapshot = (
        SELECT cost_price FROM products WHERE id = invoice_items.product_id
      )
      WHERE cost_price_snapshot = 0
    `)
    console.log('[DB] Migration: Checked/backfilled cost_price_snapshot')
  } catch (err) {
    console.error('[DB] Migration Error: Backfill failed', err)
  }

  // Seed default settings
  seedDefaultSettings(sqlDb)

  // Save to disk
  saveToFile()

  console.log('[DB] Database initialized successfully')
}

/** Save database to disk (debounced) */
export function saveToFile(): void {
  if (!sqlDb) return
  try {
    const data = sqlDb.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (error) {
    console.error('[DB] Save error:', error)
  }
}

/** Debounced save — called after every write operation */
export function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveToFile()
  }, 100) // Save 100ms after last write
}

function createTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      description TEXT DEFAULT '',
      retail_price REAL NOT NULL DEFAULT 0,
      wholesale_price REAL NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS product_units (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      unit_name TEXT NOT NULL,
      conversion_rate REAL NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_price_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      old_retail_price REAL NOT NULL,
      new_retail_price REAL NOT NULL,
      old_wholesale_price REAL NOT NULL,
      new_wholesale_price REAL NOT NULL,
      changed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      tax_code TEXT DEFAULT '',
      company_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id),
      customer_name_snapshot TEXT DEFAULT '',
      customer_phone_snapshot TEXT DEFAULT '',
      customer_address_snapshot TEXT DEFAULT '',
      customer_tax_code_snapshot TEXT DEFAULT '',
      sale_type TEXT NOT NULL DEFAULT 'retail',
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      debt_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      product_id TEXT REFERENCES products(id),
      product_name_snapshot TEXT NOT NULL,
      unit_name_snapshot TEXT NOT NULL DEFAULT '',
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      cost_price_snapshot REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT REFERENCES invoices(id),
      customer_id TEXT REFERENCES customers(id),
      amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS invoice_edit_history (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      change_summary TEXT NOT NULL DEFAULT '',
      snapshot_json TEXT NOT NULL DEFAULT '{}',
      changed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
  `)
}

function seedDefaultSettings(db: SqlJsDatabase): void {
  const defaults = [
    { key: 'store_name', value: 'Cửa hàng Thi' },
    { key: 'store_address', value: '' },
    { key: 'store_phone', value: '' },
    { key: 'store_tax_code', value: '' },
    { key: 'language', value: 'vi' },
    { key: 'invoice_prefix', value: 'HD' }
  ]

  const stmt = db.prepare('INSERT OR IGNORE INTO store_settings (key, value) VALUES (?, ?)')
  for (const setting of defaults) {
    stmt.run([setting.key, setting.value])
  }
  stmt.free()
}

/** Get the raw sql.js Database instance for direct queries */
export function getSqlDb(): SqlJsDatabase {
  if (!sqlDb) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return sqlDb
}

/**
 * Helper: run a query and return all rows as objects
 */
export function queryAll(sql: string, params: any[] = []): any[] {
  const db = getSqlDb()
  try {
    const stmt = db.prepare(sql)
    try {
      if (params.length > 0) stmt.bind(params)
      const results: any[] = []
      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }
      return results
    } finally {
      stmt.free()
    }
  } catch (e) {
    console.error('[DB] queryAll error:', sql, params, e)
    return []
  }
}

/**
 * Helper: run a query and return the first row
 */
export function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params)
  return results.length > 0 ? results[0] : null
}

/**
 * Helper: execute a write statement (INSERT/UPDATE/DELETE)
 */
export function execute(sql: string, params: any[] = []): void {
  const db = getSqlDb()
  db.run(sql, params)
  scheduleSave()
}

export function closeDatabase(): void {
  if (saveTimer) clearTimeout(saveTimer)
  if (sqlDb) {
    saveToFile()
    sqlDb.close()
    sqlDb = null
    console.log('[DB] Database closed')
  }
}
