import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { queryAll, queryOne, execute } from '../database/connection'

/** Map a raw SQLite invoice row (snake_case) to camelCase for the renderer */
function mapInvoice(row: any): any {
  if (!row) return null
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerNameSnapshot: row.customer_name_snapshot,
    customerPhoneSnapshot: row.customer_phone_snapshot,
    customerAddressSnapshot: row.customer_address_snapshot,
    customerTaxCodeSnapshot: row.customer_tax_code_snapshot,
    saleType: row.sale_type,
    subtotal: row.subtotal,
    discountAmount: row.discount_amount,
    totalAmount: row.total_amount,
    paidAmount: row.paid_amount,
    debtAmount: row.debt_amount,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/** Map a raw invoice_item row to camelCase */
function mapItem(row: any): any {
  if (!row) return null
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    productId: row.product_id,
    productNameSnapshot: row.product_name_snapshot,
    unitNameSnapshot: row.unit_name_snapshot,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    discountPercent: row.discount_percent,
    discountAmount: row.discount_amount,
    lineTotal: row.line_total
  }
}

/** Map a raw invoice_edit_history row to camelCase */
function mapHistory(row: any): any {
  if (!row) return null
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    changeSummary: row.change_summary,
    snapshotJson: row.snapshot_json,
    changedAt: row.changed_at
  }
}

/** Helper: build invoice number */
function buildInvoiceNumber(prefix: string): string {
  const result = queryOne(
    `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`,
    [`${prefix}%`]
  )
  if (result) {
    const lastSeq = parseInt(result.invoice_number.split('-').pop() || '0', 10)
    return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`
  }
  return `${prefix}0001`
}

export function registerInvoiceHandlers(): void {
  // ── Generate next invoice number ──────────────────────────────────────────
  ipcMain.handle('invoices:nextNumber', async () => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const prefix = `HD-${dateStr}-`
    return buildInvoiceNumber(prefix)
  })

  // ── Create invoice (status: 'draft' | 'completed') ──────────────────────
  ipcMain.handle('invoices:create', async (_event, data: any) => {
    const id = uuidv4()
    const today = new Date()
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const prefix = `HD-${dateStr}-`
    const invoiceNumber = buildInvoiceNumber(prefix)

    // Customer snapshot
    let customerNameSnapshot = ''
    let customerPhoneSnapshot = ''
    let customerAddressSnapshot = ''
    let customerTaxCodeSnapshot = ''
    if (data.customerId) {
      const customer = queryOne('SELECT * FROM customers WHERE id = ?', [data.customerId])
      if (customer) {
        customerNameSnapshot = customer.name || ''
        customerPhoneSnapshot = customer.phone || ''
        customerAddressSnapshot = customer.address || ''
        customerTaxCodeSnapshot = customer.tax_code || ''
      }
    }

    // Totals
    let subtotal = 0
    for (const item of data.items) subtotal += item.lineTotal || 0
    const discountAmount = data.discountAmount || 0
    const totalAmount = subtotal - discountAmount
    const paidAmount = data.paidAmount || 0
    const debtAmount = Math.max(0, totalAmount - paidAmount)
    const status = data.status === 'draft' ? 'draft' : 'completed'

    execute(
      `INSERT INTO invoices (id, invoice_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
        customer_address_snapshot, customer_tax_code_snapshot, sale_type, subtotal, discount_amount,
        total_amount, paid_amount, debt_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, invoiceNumber, data.customerId || null, customerNameSnapshot, customerPhoneSnapshot,
       customerAddressSnapshot, customerTaxCodeSnapshot, data.saleType || 'retail',
       subtotal, discountAmount, totalAmount, paidAmount, debtAmount, status, data.notes || '']
    )

    for (const item of data.items) {
      let costPriceSnapshot = 0
      if (item.productId) {
        const product = queryOne('SELECT cost_price FROM products WHERE id = ?', [item.productId])
        if (product) costPriceSnapshot = product.cost_price || 0
      }
      execute(
        `INSERT INTO invoice_items (id, invoice_id, product_id, product_name_snapshot, unit_name_snapshot,
          quantity, unit_price, discount_percent, discount_amount, line_total, cost_price_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, item.productId || null, item.productNameSnapshot,
         item.unitNameSnapshot || '', item.quantity || 1, item.unitPrice || 0,
         item.discountPercent || 0, item.discountAmount || 0, item.lineTotal || 0, costPriceSnapshot]
      )
    }

    if (status === 'completed' && paidAmount > 0) {
      execute(
        `INSERT INTO payments (id, invoice_id, customer_id, amount, payment_method, notes)
         VALUES (?, ?, ?, ?, 'cash', 'Thanh toán khi tạo hóa đơn')`,
        [uuidv4(), id, data.customerId || null, paidAmount]
      )
    }

    return { success: true, id, invoiceNumber }
  })

  // ── Update draft invoice ──────────────────────────────────────────────────
  ipcMain.handle('invoices:update', async (_event, id: string, data: any) => {
    const existing = queryOne('SELECT * FROM invoices WHERE id = ?', [id])
    if (!existing) throw new Error('Invoice not found')
    if (existing.status === 'cancelled') throw new Error('Không thể chỉnh sửa hóa đơn đã hủy')

    // Customer snapshot
    let customerNameSnapshot = existing.customer_name_snapshot || ''
    let customerPhoneSnapshot = existing.customer_phone_snapshot || ''
    let customerAddressSnapshot = existing.customer_address_snapshot || ''
    let customerTaxCodeSnapshot = existing.customer_tax_code_snapshot || ''
    if (data.customerId) {
      const customer = queryOne('SELECT * FROM customers WHERE id = ?', [data.customerId])
      if (customer) {
        customerNameSnapshot = customer.name || ''
        customerPhoneSnapshot = customer.phone || ''
        customerAddressSnapshot = customer.address || ''
        customerTaxCodeSnapshot = customer.tax_code || ''
      }
    }

    // Totals
    let subtotal = 0
    for (const item of data.items) subtotal += item.lineTotal || 0
    const discountAmount = data.discountAmount || 0
    const totalAmount = subtotal - discountAmount
    const paidAmount = data.paidAmount || 0
    const debtAmount = Math.max(0, totalAmount - paidAmount)

    // Save snapshot BEFORE update (for history — full detail)
    const oldItems = queryAll('SELECT * FROM invoice_items WHERE invoice_id = ?', [id])
    const snapshot = {
      customerName: existing.customer_name_snapshot || '',
      saleType: existing.sale_type || 'retail',
      subtotal: existing.subtotal,
      discountAmount: existing.discount_amount,
      totalAmount: existing.total_amount,
      paidAmount: existing.paid_amount,
      notes: existing.notes || '',
      items: oldItems.map((it: any) => ({
        name: it.product_name_snapshot,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        discountPercent: it.discount_percent,
        lineTotal: it.line_total
      }))
    }

    // Build change summary (human-readable)
    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ'
    const changes: string[] = []
    if (Math.abs((existing.subtotal || 0) - subtotal) > 0.01)
      changes.push(`Tạm tính: ${fmt(existing.subtotal)} → ${fmt(subtotal)}`)
    if (Math.abs((existing.discount_amount || 0) - discountAmount) > 0.01)
      changes.push(`Giảm giá: ${fmt(existing.discount_amount)} → ${fmt(discountAmount)}`)
    if (Math.abs((existing.total_amount || 0) - totalAmount) > 0.01)
      changes.push(`Tổng cộng: ${fmt(existing.total_amount)} → ${fmt(totalAmount)}`)
    if (Math.abs((existing.paid_amount || 0) - paidAmount) > 0.01)
      changes.push(`Thanh toán: ${fmt(existing.paid_amount)} → ${fmt(paidAmount)}`)
    if ((existing.notes || '') !== (data.notes || ''))
      changes.push(`Ghi chú thay đổi`)
    if (oldItems.length !== data.items.length)
      changes.push(`Số sản phẩm: ${oldItems.length} → ${data.items.length}`)
    // Detect item-level changes
    const itemChanges: string[] = []
    for (const newItem of data.items) {
      const oldItem = oldItems.find((oi: any) => oi.product_id === newItem.productId)
      if (!oldItem) {
        itemChanges.push(`Thêm: ${newItem.productNameSnapshot}`)
      } else if (Math.abs(oldItem.quantity - newItem.quantity) > 0.001) {
        itemChanges.push(`${newItem.productNameSnapshot}: ${oldItem.quantity} → ${newItem.quantity}`)
      } else if (Math.abs(oldItem.unit_price - newItem.unitPrice) > 0.01) {
        itemChanges.push(`${newItem.productNameSnapshot}: ${fmt(oldItem.unit_price)} → ${fmt(newItem.unitPrice)}`)
      }
    }
    for (const oldIt of oldItems) {
      if (!data.items.find((ni: any) => ni.productId === oldIt.product_id)) {
        itemChanges.push(`Xóa: ${oldIt.product_name_snapshot}`)
      }
    }
    if (itemChanges.length > 0) changes.push(...itemChanges)
    const changeSummary = changes.length > 0 ? changes.join('; ') : 'Cập nhật hóa đơn'

    // Update invoice
    execute(
      `UPDATE invoices SET
        customer_id = ?, customer_name_snapshot = ?, customer_phone_snapshot = ?,
        customer_address_snapshot = ?, customer_tax_code_snapshot = ?,
        sale_type = ?, subtotal = ?, discount_amount = ?, total_amount = ?,
        paid_amount = ?, debt_amount = ?, notes = ?,
        updated_at = datetime('now','localtime')
       WHERE id = ?`,
      [data.customerId || null, customerNameSnapshot, customerPhoneSnapshot,
       customerAddressSnapshot, customerTaxCodeSnapshot, data.saleType || 'retail',
       subtotal, discountAmount, totalAmount, paidAmount, debtAmount,
       data.notes || '', id]
    )

    // Delete old items and re-insert
    execute('DELETE FROM invoice_items WHERE invoice_id = ?', [id])
    for (const item of data.items) {
      let costPriceSnapshot = 0
      if (item.productId) {
        const product = queryOne('SELECT cost_price FROM products WHERE id = ?', [item.productId])
        if (product) costPriceSnapshot = product.cost_price || 0
      }
      execute(
        `INSERT INTO invoice_items (id, invoice_id, product_id, product_name_snapshot, unit_name_snapshot,
          quantity, unit_price, discount_percent, discount_amount, line_total, cost_price_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, item.productId || null, item.productNameSnapshot,
         item.unitNameSnapshot || '', item.quantity || 1, item.unitPrice || 0,
         item.discountPercent || 0, item.discountAmount || 0, item.lineTotal || 0, costPriceSnapshot]
      )
    }

    // Record edit history
    execute(
      `INSERT INTO invoice_edit_history (id, invoice_id, change_summary, snapshot_json, changed_at)
       VALUES (?, ?, ?, ?, datetime('now','localtime'))`,
      [uuidv4(), id, changeSummary, JSON.stringify(snapshot)]
    )

    return { success: true }
  })

  // ── Confirm draft → completed ─────────────────────────────────────────────
  ipcMain.handle('invoices:confirm', async (_event, id: string) => {
    const existing = queryOne('SELECT * FROM invoices WHERE id = ?', [id])
    if (!existing) throw new Error('Invoice not found')

    execute(
      `UPDATE invoices SET status = 'completed', updated_at = datetime('now','localtime') WHERE id = ?`,
      [id]
    )

    // Record payment if paidAmount > 0 and no payment exists yet
    const hasPayment = queryOne('SELECT id FROM payments WHERE invoice_id = ?', [id])
    if (!hasPayment && (existing.paid_amount || 0) > 0) {
      execute(
        `INSERT INTO payments (id, invoice_id, customer_id, amount, payment_method, notes)
         VALUES (?, ?, ?, ?, 'cash', 'Thanh toán khi xác nhận hóa đơn')`,
        [uuidv4(), id, existing.customer_id || null, existing.paid_amount]
      )
    }

    // Record history
    execute(
      `INSERT INTO invoice_edit_history (id, invoice_id, change_summary, snapshot_json, changed_at)
       VALUES (?, ?, 'Xác nhận hóa đơn (Draft → Hoàn thành)', '{}', datetime('now','localtime'))`,
      [uuidv4(), id]
    )

    return { success: true }
  })

  // ── List invoices ─────────────────────────────────────────────────────────
  ipcMain.handle('invoices:list', async (_event, filters?: any) => {
    let sql = 'SELECT * FROM invoices'
    const params: any[] = []
    const conditions: string[] = []

    if (filters?.search) {
      conditions.push('(invoice_number LIKE ? OR customer_name_snapshot LIKE ?)')
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters?.status) {
      conditions.push('status = ?')
      params.push(filters.status)
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY created_at DESC LIMIT 200'

    return queryAll(sql, params).map(mapInvoice)
  })

  // ── Get single invoice with items, payments, and history ─────────────────
  ipcMain.handle('invoices:get', async (_event, id: string) => {
    const raw = queryOne('SELECT * FROM invoices WHERE id = ?', [id])
    if (!raw) return null

    const invoice = mapInvoice(raw)
    invoice.items = queryAll(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY rowid ASC', [id]
    ).map(mapItem)
    invoice.payments = queryAll(
      'SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at ASC', [id]
    )
    invoice.editHistory = queryAll(
      'SELECT * FROM invoice_edit_history WHERE invoice_id = ? ORDER BY changed_at DESC', [id]
    ).map(mapHistory)
    return invoice
  })

  // ── Cancel invoice ────────────────────────────────────────────────────────
  ipcMain.handle('invoices:cancel', async (_event, id: string) => {
    execute(
      `UPDATE invoices SET status = 'cancelled', updated_at = datetime('now','localtime') WHERE id = ?`,
      [id]
    )
    execute(
      `INSERT INTO invoice_edit_history (id, invoice_id, change_summary, snapshot_json, changed_at)
       VALUES (?, ?, 'Hủy hóa đơn', '{}', datetime('now','localtime'))`,
      [uuidv4(), id]
    )
    return { success: true }
  })

  // ── Dashboard stats ───────────────────────────────────────────────────────
  ipcMain.handle('invoices:dashboardStats', async () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const todayStats = queryOne(
      `SELECT 
         COALESCE(SUM(i.total_amount), 0) as todayRevenue, 
         COUNT(i.id) as todayInvoiceCount,
         COALESCE(SUM(i.total_amount - (
           SELECT COALESCE(SUM(ii.quantity * ii.cost_price_snapshot), 0) 
           FROM invoice_items ii WHERE ii.invoice_id = i.id
         )), 0) as todayProfit
       FROM invoices i WHERE date(i.created_at) = ? AND i.status = 'completed'`,
      [todayStr]
    )

    const debtResult = queryOne(
      `SELECT COALESCE(SUM(debt_amount), 0) as totalDebt FROM invoices WHERE status = 'completed'`
    )

    const customerResult = queryOne(
      `SELECT COUNT(*) as totalCustomers FROM customers WHERE is_active = 1`
    )

    const last7Days: { date: string; revenue: number; profit: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayResult = queryOne(
        `SELECT 
           COALESCE(SUM(i.total_amount), 0) as revenue,
           COALESCE(SUM(i.total_amount - (
             SELECT COALESCE(SUM(ii.quantity * ii.cost_price_snapshot), 0) 
             FROM invoice_items ii WHERE ii.invoice_id = i.id
           )), 0) as profit
         FROM invoices i WHERE date(i.created_at) = ? AND i.status = 'completed'`,
        [dateStr]
      )
      last7Days.push({ date: dateStr, revenue: dayResult?.revenue || 0, profit: dayResult?.profit || 0 })
    }

    const recentInvoices = queryAll(
      `SELECT * FROM invoices ORDER BY created_at DESC LIMIT 10`
    ).map(mapInvoice)

    const topDebtors = queryAll(
      `SELECT customer_id as customerId, customer_name_snapshot as customerName,
              SUM(debt_amount) as totalDebt
       FROM invoices WHERE status = 'completed' AND debt_amount > 0
       GROUP BY customer_id ORDER BY totalDebt DESC LIMIT 5`
    )

    return {
      todayRevenue: todayStats?.todayRevenue || 0,
      todayProfit: todayStats?.todayProfit || 0,
      todayInvoiceCount: todayStats?.todayInvoiceCount || 0,
      totalDebt: debtResult?.totalDebt || 0,
      totalCustomers: customerResult?.totalCustomers || 0,
      last7Days,
      recentInvoices,
      topDebtors
    }
  })

  // ── Day detail (Historical/Specific Day) ──────────────────────────────────
  ipcMain.handle('invoices:dayDetail', async (_event, dateStr: string) => {
    // dateStr format: YYYY-MM-DD
    const summary = queryOne(
      `SELECT 
         COALESCE(SUM(i.total_amount), 0) as revenue,
         COALESCE(SUM(i.debt_amount), 0) as debt,
         COUNT(i.id) as invoiceCount,
         COALESCE(SUM(i.total_amount - (
           SELECT COALESCE(SUM(ii.quantity * ii.cost_price_snapshot), 0) 
           FROM invoice_items ii WHERE ii.invoice_id = i.id
         )), 0) as profit
       FROM invoices i WHERE date(i.created_at) = ? AND i.status = 'completed'`,
      [dateStr]
    )

    const invoices = queryAll(
      `SELECT 
         i.*,
         COALESCE(i.total_amount - (
           SELECT COALESCE(SUM(ii.quantity * ii.cost_price_snapshot), 0) 
           FROM invoice_items ii WHERE ii.invoice_id = i.id
         ), 0) as profit
       FROM invoices i 
       WHERE date(i.created_at) = ? AND i.status = 'completed'
       ORDER BY i.created_at DESC`,
      [dateStr]
    ).map(row => {
      const inv = mapInvoice(row)
      inv.profit = row.profit
      return inv
    })

    return {
      revenue: summary?.revenue || 0,
      profit: summary?.profit || 0,
      debt: summary?.debt || 0,
      invoiceCount: summary?.invoiceCount || 0,
      invoices
    }
  })
}
