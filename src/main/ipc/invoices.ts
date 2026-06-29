import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { queryAll, queryOne, execute } from '../database/connection'
import { mapInvoice, mapItem, mapHistory, buildInvoiceNumber, fmtVND } from './helpers/invoiceHelpers'

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

    // Save snapshot BEFORE update (for history)
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

    // Build human-readable change summary
    const changes: string[] = []
    if (Math.abs((existing.subtotal || 0) - subtotal) > 0.01)
      changes.push(`Tạm tính: ${fmtVND(existing.subtotal)} → ${fmtVND(subtotal)}`)
    if (Math.abs((existing.discount_amount || 0) - discountAmount) > 0.01)
      changes.push(`Giảm giá: ${fmtVND(existing.discount_amount)} → ${fmtVND(discountAmount)}`)
    if (Math.abs((existing.total_amount || 0) - totalAmount) > 0.01)
      changes.push(`Tổng cộng: ${fmtVND(existing.total_amount)} → ${fmtVND(totalAmount)}`)
    if (Math.abs((existing.paid_amount || 0) - paidAmount) > 0.01)
      changes.push(`Thanh toán: ${fmtVND(existing.paid_amount)} → ${fmtVND(paidAmount)}`)
    if ((existing.notes || '') !== (data.notes || ''))
      changes.push(`Ghi chú thay đổi`)
    if (oldItems.length !== data.items.length)
      changes.push(`Số sản phẩm: ${oldItems.length} → ${data.items.length}`)

    const itemChanges: string[] = []
    for (const newItem of data.items) {
      const oldItem = oldItems.find((oi: any) => oi.product_id === newItem.productId)
      if (!oldItem) {
        itemChanges.push(`Thêm: ${newItem.productNameSnapshot}`)
      } else if (Math.abs(oldItem.quantity - newItem.quantity) > 0.001) {
        itemChanges.push(`${newItem.productNameSnapshot}: ${oldItem.quantity} → ${newItem.quantity}`)
      } else if (Math.abs(oldItem.unit_price - newItem.unitPrice) > 0.01) {
        itemChanges.push(`${newItem.productNameSnapshot}: ${fmtVND(oldItem.unit_price)} → ${fmtVND(newItem.unitPrice)}`)
      }
    }
    for (const oldIt of oldItems) {
      if (!data.items.find((ni: any) => ni.productId === oldIt.product_id)) {
        itemChanges.push(`Xóa: ${oldIt.product_name_snapshot}`)
      }
    }
    if (itemChanges.length > 0) changes.push(...itemChanges)
    const changeSummary = changes.length > 0 ? changes.join('; ') : 'Cập nhật hóa đơn'

    // Update invoice row
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

    const hasPayment = queryOne('SELECT id FROM payments WHERE invoice_id = ?', [id])
    if (!hasPayment && (existing.paid_amount || 0) > 0) {
      execute(
        `INSERT INTO payments (id, invoice_id, customer_id, amount, payment_method, notes)
         VALUES (?, ?, ?, ?, 'cash', 'Thanh toán khi xác nhận hóa đơn')`,
        [uuidv4(), id, existing.customer_id || null, existing.paid_amount]
      )
    }

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
}
