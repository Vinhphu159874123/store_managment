import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { queryAll, queryOne, execute } from '../database/connection'

export function registerProductHandlers(): void {
  // List products (with optional search)
  ipcMain.handle('products:list', async (_event, search?: string) => {
    let sql = 'SELECT * FROM products WHERE is_active = 1'
    const params: any[] = []
    if (search) {
      sql += ' AND (name LIKE ? OR code LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    sql += ' ORDER BY created_at DESC'
    return queryAll(sql, params)
  })

  // Get single product with units and price history
  ipcMain.handle('products:get', async (_event, id: string) => {
    const product = queryOne('SELECT * FROM products WHERE id = ?', [id])
    if (!product) return null
    product.units = queryAll('SELECT * FROM product_units WHERE product_id = ?', [id])
    product.priceHistory = queryAll(
      'SELECT * FROM product_price_history WHERE product_id = ? ORDER BY changed_at DESC LIMIT 20',
      [id]
    )
    return product
  })

  // Create product — mã tự sinh theo thứ tự SP001, SP002...
  ipcMain.handle('products:create', async (_event, data: any) => {
    const id = uuidv4()
    // Tìm số thứ tự lớn nhất hiện có
    const last = queryOne(`SELECT code FROM products WHERE code LIKE 'SP%' ORDER BY code DESC LIMIT 1`)
    let nextNum = 1
    if (last?.code) {
      const num = parseInt(last.code.replace('SP', ''), 10)
      if (!isNaN(num)) nextNum = num + 1
    }
    const autoCode = `SP${String(nextNum).padStart(3, '0')}`
    execute(
      `INSERT INTO products (id, code, name, category, description, retail_price, wholesale_price, cost_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, autoCode, data.name, data.category || '', data.description || '',
       data.retailPrice || 0, data.wholesalePrice || 0, data.costPrice || 0]
    )
    return { success: true, id, code: autoCode }
  })

  // Update product (with price history tracking)
  ipcMain.handle('products:update', async (_event, id: string, data: any) => {
    const existing = queryOne('SELECT * FROM products WHERE id = ?', [id])
    if (!existing) throw new Error('Product not found')

    // Record price change if prices changed
    if (data.retailPrice !== undefined && data.wholesalePrice !== undefined) {
      if (existing.retail_price !== data.retailPrice || existing.wholesale_price !== data.wholesalePrice) {
        execute(
          `INSERT INTO product_price_history (id, product_id, old_retail_price, new_retail_price, old_wholesale_price, new_wholesale_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uuidv4(), id, existing.retail_price, data.retailPrice, existing.wholesale_price, data.wholesalePrice]
        )
      }
    }

    execute(
      `UPDATE products SET
        name = ?, category = ?, description = ?,
        retail_price = ?, wholesale_price = ?, cost_price = ?,
        updated_at = datetime('now','localtime')
       WHERE id = ?`,
      [data.name, data.category || '', data.description || '',
       data.retailPrice || 0, data.wholesalePrice || 0, data.costPrice || 0, id]
    )
    return { success: true }
  })

  // Soft delete product
  ipcMain.handle('products:delete', async (_event, id: string) => {
    execute(
      `UPDATE products SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?`,
      [id]
    )
    return { success: true }
  })

  // Update product units
  ipcMain.handle('products:updateUnits', async (_event, productId: string, units: any[]) => {
    execute('DELETE FROM product_units WHERE product_id = ?', [productId])
    for (const unit of units) {
      execute(
        `INSERT INTO product_units (id, product_id, unit_name, conversion_rate, is_default)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), productId, unit.unitName, unit.conversionRate || 1, unit.isDefault ? 1 : 0]
      )
    }
    return { success: true }
  })

  // Get product categories
  ipcMain.handle('products:categories', async () => {
    const rows = queryAll(
      "SELECT DISTINCT category FROM products WHERE category != '' AND is_active = 1 ORDER BY category"
    )
    return rows.map((r: any) => r.category)
  })
}
