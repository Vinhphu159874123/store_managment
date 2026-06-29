import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { getDbPath, getBackupDir, saveToFile } from '../database/connection'

export function registerBackupHandlers(): void {
  // Create backup
  ipcMain.handle('backup:create', async () => {
    try {
      // Ensure latest data is saved
      saveToFile()

      const dbPath = getDbPath()
      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Database file not found' }
      }

      const backupDir = getBackupDir()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `backup-${timestamp}.db`
      const backupPath = path.join(backupDir, backupName)

      fs.copyFileSync(dbPath, backupPath)
      return { success: true, filePath: backupPath }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Restore from backup
  ipcMain.handle('backup:restore', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Chọn file sao lưu để phục hồi',
        filters: [{ name: 'Database', extensions: ['db'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'cancelled' }
      }

      const backupFile = result.filePaths[0]
      const dbPath = getDbPath()

      // Create a backup of current before restoring
      const backupDir = getBackupDir()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      fs.copyFileSync(dbPath, path.join(backupDir, `pre-restore-${timestamp}.db`))

      // Copy the backup file over the current database
      fs.copyFileSync(backupFile, dbPath)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // List backups
  ipcMain.handle('backup:list', async () => {
    try {
      const backupDir = getBackupDir()
      if (!fs.existsSync(backupDir)) return []

      const files = fs.readdirSync(backupDir)
        .filter((f) => f.endsWith('.db'))
        .map((name) => {
          const filePath = path.join(backupDir, name)
          const stat = fs.statSync(filePath)
          return {
            name,
            path: filePath,
            size: stat.size,
            date: stat.mtime.toISOString()
          }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      return files
    } catch {
      return []
    }
  })

  // ── Google Drive backup ──────────────────────────────────────────────────
  ipcMain.handle('backup:driveStatus', async () => {
    const { getBackupStatus } = await import('../database/backup')
    return getBackupStatus()
  })

  ipcMain.handle('backup:driveNow', async () => {
    saveToFile()
    const { forceBackup } = await import('../database/backup')
    return forceBackup()
  })
}
