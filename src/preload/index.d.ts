import { ElectronAPI } from '@electron-toolkit/preload'

interface ProductsAPI {
  list(search?: string): Promise<any[]>
  get(id: string): Promise<any>
  create(data: any): Promise<{ success: boolean; id: string }>
  update(id: string, data: any): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
  updateUnits(productId: string, units: any[]): Promise<{ success: boolean }>
  categories(): Promise<string[]>
}

interface CustomersAPI {
  list(search?: string): Promise<any[]>
  get(id: string): Promise<any>
  create(data: any): Promise<{ success: boolean; id: string }>
  update(id: string, data: any): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
}

interface InvoicesAPI {
  create(data: any): Promise<{ success: boolean; id: string; invoiceNumber: string }>
  list(filters?: any): Promise<any[]>
  get(id: string): Promise<any>
  cancel(id: string): Promise<{ success: boolean }>
  update(id: string, data: any): Promise<{ success: boolean }>
  confirm(id: string): Promise<{ success: boolean }>
  nextNumber(): Promise<string>
  dashboardStats(): Promise<any>
}

interface PaymentsAPI {
  create(data: any): Promise<{ success: boolean; id: string }>
  listByInvoice(invoiceId: string): Promise<any[]>
  listByCustomer(customerId: string): Promise<any[]>
}

interface SettingsAPI {
  getAll(): Promise<Record<string, string>>
  get(key: string): Promise<string>
  set(key: string, value: string): Promise<{ success: boolean }>
  setMany(settings: Record<string, string>): Promise<{ success: boolean }>
}

interface BackupAPI {
  create(): Promise<{ success: boolean; filePath: string; error?: string }>
  restore(): Promise<{ success: boolean; error?: string }>
  list(): Promise<{ name: string; path: string; size: number; date: string }[]>
}

interface API {
  products: ProductsAPI
  customers: CustomersAPI
  invoices: InvoicesAPI
  payments: PaymentsAPI
  settings: SettingsAPI
  backup: BackupAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
