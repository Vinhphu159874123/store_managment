import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { queryAll, queryOne, execute } from '../database/connection'

export function registerPaymentHandlers(): void {
  // Create payment
  ipcMain.handle('payments:create', async (_event, data: any) => {
    const id = uuidv4()

    execute(
      `INSERT INTO payments (id, invoice_id, customer_id, amount, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.invoiceId, data.customerId || null, data.amount,
       data.paymentMethod || 'cash', data.notes || '']
    )

    // Update invoice paid_amount and debt_amount
    if (data.invoiceId) {
      const invoice = queryOne('SELECT * FROM invoices WHERE id = ?', [data.invoiceId])
      if (invoice) {
        const newPaid = (invoice.paid_amount || 0) + data.amount
        const newDebt = Math.max(0, (invoice.total_amount || 0) - newPaid)
        execute(
          `UPDATE invoices SET paid_amount = ?, debt_amount = ?, updated_at = datetime('now','localtime')
           WHERE id = ?`,
          [newPaid, newDebt, data.invoiceId]
        )
      }
    }

    return { success: true, id }
  })

  // List payments by invoice
  ipcMain.handle('payments:listByInvoice', async (_event, invoiceId: string) => {
    return queryAll(
      'SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC',
      [invoiceId]
    )
  })

  // List payments by customer
  ipcMain.handle('payments:listByCustomer', async (_event, customerId: string) => {
    return queryAll(
      'SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId]
    )
  })
}
