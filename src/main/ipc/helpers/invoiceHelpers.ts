import { queryOne } from '../../database/connection'

/** Map a raw SQLite invoice row (snake_case) to camelCase for the renderer */
export function mapInvoice(row: any): any {
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
export function mapItem(row: any): any {
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
    lineTotal: row.line_total,
    costPriceSnapshot: row.cost_price_snapshot
  }
}

/** Map a raw invoice_edit_history row to camelCase */
export function mapHistory(row: any): any {
  if (!row) return null
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    changeSummary: row.change_summary,
    snapshotJson: row.snapshot_json,
    changedAt: row.changed_at
  }
}

/** Build next sequential invoice number for today */
export function buildInvoiceNumber(prefix: string): string {
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

/** Format number as VND string for change summaries */
export function fmtVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ'
}
