import { registerProductHandlers } from './products'
import { registerCustomerHandlers } from './customers'
import { registerInvoiceHandlers } from './invoices'
import { registerPaymentHandlers } from './payments'
import { registerSettingsHandlers } from './settings'
import { registerBackupHandlers } from './backup'
import { registerReportHandlers } from './reports'

export function registerAllIpcHandlers(): void {
  registerProductHandlers()
  registerCustomerHandlers()
  registerInvoiceHandlers()
  registerPaymentHandlers()
  registerSettingsHandlers()
  registerBackupHandlers()
  registerReportHandlers()
  console.log('[IPC] All handlers registered')
}

