import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { queryAll, queryOne, execute } from '../database/connection'

export function registerCustomerHandlers(): void {
  // List customers (with optional search)
  ipcMain.handle('customers:list', async (_event, search?: string) => {
    try {
      let sql = `SELECT c.*,
        COALESCE((
          SELECT SUM(debt_amount) FROM invoices
          WHERE customer_id = c.id AND status = 'completed'
        ), 0) as total_debt
        FROM customers c WHERE c.is_active = 1`
      const params: any[] = []
      if (search && search.trim()) {
        sql += ' AND (c.name LIKE ? OR c.phone LIKE ?)'
        params.push(`%${search}%`, `%${search}%`)
      }
      sql += ' ORDER BY c.name ASC'
      return queryAll(sql, params)
    } catch (e) {
      console.error('customers:list error', e)
      return []
    }
  })

  // Get single customer with invoices and payments
  ipcMain.handle('customers:get', async (_event, id: string) => {
    const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id])
    if (!customer) return null

    // Calculate total debt
    const debtResult = queryOne(
      `SELECT COALESCE(SUM(debt_amount), 0) as totalDebt
       FROM invoices WHERE customer_id = ? AND status = 'completed'`,
      [id]
    )
    customer.totalDebt = debtResult?.totalDebt || 0

    // Recent invoices
    customer.invoices = queryAll(
      `SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20`,
      [id]
    )

    // Recent payments
    customer.payments = queryAll(
      `SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20`,
      [id]
    )

    return customer
  })

  // Create customer — mã tự sinh theo thứ tự KH001, KH002...
  ipcMain.handle('customers:create', async (_event, data: any) => {
    const id = uuidv4()
    // Tìm số thứ tự lớn nhất hiện có
    const last = queryOne(`SELECT code FROM customers WHERE code LIKE 'KH%' ORDER BY code DESC LIMIT 1`)
    let nextNum = 1
    if (last?.code) {
      const num = parseInt(last.code.replace('KH', ''), 10)
      if (!isNaN(num)) nextNum = num + 1
    }
    const autoCode = `KH${String(nextNum).padStart(3, '0')}`
    execute(
      `INSERT INTO customers (id, code, name, phone, address, tax_code, company_name, email, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, autoCode, data.name, data.phone || '', data.address || '',
       data.taxCode || '', data.companyName || '', data.email || '', data.notes || '']
    )
    return { success: true, id, code: autoCode }
  })

  // Update customer
  ipcMain.handle('customers:update', async (_event, id: string, data: any) => {
    execute(
      `UPDATE customers SET
        name = ?, phone = ?, address = ?, tax_code = ?, company_name = ?, email = ?, notes = ?,
        updated_at = datetime('now','localtime')
       WHERE id = ?`,
      [data.name, data.phone || '', data.address || '', data.taxCode || '',
       data.companyName || '', data.email || '', data.notes || '', id]
    )
    return { success: true }
  })

  // Delete customer (soft)
  ipcMain.handle('customers:delete', async (_event, id: string) => {
    execute(
      `UPDATE customers SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?`,
      [id]
    )
    return { success: true }
  })
}
