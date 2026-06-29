import { ipcMain } from 'electron'
import { queryAll, queryOne, execute } from '../database/connection'

export function registerSettingsHandlers(): void {
  // Get all settings
  ipcMain.handle('settings:getAll', async () => {
    const rows = queryAll('SELECT * FROM store_settings')
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  })

  // Get single setting
  ipcMain.handle('settings:get', async (_event, key: string) => {
    const row = queryOne('SELECT value FROM store_settings WHERE key = ?', [key])
    return row?.value || ''
  })

  // Set single setting
  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    execute(
      'INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)',
      [key, value]
    )
    return { success: true }
  })

  // Set multiple settings
  ipcMain.handle('settings:setMany', async (_event, settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      execute(
        'INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)',
        [key, value]
      )
    }
    return { success: true }
  })
}
