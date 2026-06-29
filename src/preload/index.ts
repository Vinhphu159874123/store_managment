import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom API exposed to renderer
const api = {
  // Products
  products: {
    list: (search?: string) => ipcRenderer.invoke('products:list', search),
    get: (id: string) => ipcRenderer.invoke('products:get', id),
    create: (data: any) => ipcRenderer.invoke('products:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('products:delete', id),
    updateUnits: (productId: string, units: any[]) =>
      ipcRenderer.invoke('products:updateUnits', productId, units),
    categories: () => ipcRenderer.invoke('products:categories')
  },

  // Customers
  customers: {
    list: (search?: string) => ipcRenderer.invoke('customers:list', search),
    get: (id: string) => ipcRenderer.invoke('customers:get', id),
    create: (data: any) => ipcRenderer.invoke('customers:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('customers:delete', id)
  },

  // Invoices
  invoices: {
    create: (data: any) => ipcRenderer.invoke('invoices:create', data),
    list: (filters?: any) => ipcRenderer.invoke('invoices:list', filters),
    get: (id: string) => ipcRenderer.invoke('invoices:get', id),
    cancel: (id: string) => ipcRenderer.invoke('invoices:cancel', id),
    update: (id: string, data: any) => ipcRenderer.invoke('invoices:update', id, data),
    confirm: (id: string) => ipcRenderer.invoke('invoices:confirm', id),
    nextNumber: () => ipcRenderer.invoke('invoices:nextNumber'),
    dashboardStats: () => ipcRenderer.invoke('invoices:dashboardStats'),
    dayDetail: (dateStr: string) => ipcRenderer.invoke('invoices:dayDetail', dateStr)
  },

  // Payments
  payments: {
    create: (data: any) => ipcRenderer.invoke('payments:create', data),
    listByInvoice: (invoiceId: string) => ipcRenderer.invoke('payments:listByInvoice', invoiceId),
    listByCustomer: (customerId: string) =>
      ipcRenderer.invoke('payments:listByCustomer', customerId)
  },

  // Settings
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    setMany: (settings: Record<string, string>) =>
      ipcRenderer.invoke('settings:setMany', settings)
  },

  // Backup
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
    list: () => ipcRenderer.invoke('backup:list'),
    driveStatus: () => ipcRenderer.invoke('backup:driveStatus'),
    driveNow: () => ipcRenderer.invoke('backup:driveNow')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
