import { ipcMain } from 'electron'
import { queryAll, queryOne } from '../database/connection'
import { mapInvoice } from './helpers/invoiceHelpers'

export function registerReportHandlers(): void {
  // ── Dashboard stats ─────────────────────────────────────────────────────────
  ipcMain.handle('invoices:dashboardStats', async () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const todayStats = queryOne(
      `SELECT 
         COALESCE(SUM(i.total_amount), 0) as todayRevenue, 
         COALESCE(SUM(i.debt_amount), 0) as todayNewDebt,
         COUNT(i.id) as todayInvoiceCount,
         COALESCE(SUM(i.total_amount - (
           SELECT COALESCE(SUM(ii.quantity * ii.cost_price_snapshot), 0) 
           FROM invoice_items ii WHERE ii.invoice_id = i.id
         )), 0) as todayProfit
       FROM invoices i WHERE date(i.created_at) = ? AND i.status = 'completed'`,
      [todayStr]
    )

    const paymentStats = queryOne(
      `SELECT COALESCE(SUM(amount), 0) as todayCollected FROM payments WHERE date(created_at) = ?`,
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
      todayCollected: paymentStats?.todayCollected || 0,
      todayProfit: todayStats?.todayProfit || 0,
      todayNewDebt: todayStats?.todayNewDebt || 0,
      todayInvoiceCount: todayStats?.todayInvoiceCount || 0,
      totalDebt: debtResult?.totalDebt || 0,
      totalCustomers: customerResult?.totalCustomers || 0,
      last7Days,
      recentInvoices,
      topDebtors
    }
  })

  // ── Day detail (historical/specific day) ────────────────────────────────────
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

    const paymentStats = queryOne(
      `SELECT COALESCE(SUM(amount), 0) as collected FROM payments WHERE date(created_at) = ?`,
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
      collected: paymentStats?.collected || 0,
      profit: summary?.profit || 0,
      debt: summary?.debt || 0,
      invoiceCount: summary?.invoiceCount || 0,
      invoices
    }
  })
}
