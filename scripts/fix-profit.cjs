const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, '../data/shop-management.db')
const db = new Database(dbPath)

console.log('Fixing cost_price_snapshot for old invoices...')
const result = db.prepare(`
  UPDATE invoice_items 
  SET cost_price_snapshot = (
    SELECT cost_price FROM products WHERE id = invoice_items.product_id
  )
  WHERE cost_price_snapshot = 0 OR cost_price_snapshot IS NULL
`).run()

console.log('Update completed. Rows affected:', result.changes)
db.close()
