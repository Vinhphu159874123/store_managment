import { registerProductHandlers } from './products'
import { registerCustomerHandlers } from './customers'
import { registerInvoiceHandlers } from './invoices'
import { registerPaymentHandlers } from './payments'
import { registerSettingsHandlers } from './settings'
import { registerBackupHandlers } from './backup'

export function registerAllIpcHandlers(): void {
  registerProductHandlers()
  registerCustomerHandlers()
  registerInvoiceHandlers()
  registerPaymentHandlers()
  registerSettingsHandlers()
  registerBackupHandlers()
  console.log('[IPC] All handlers registered')
}
