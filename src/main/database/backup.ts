/**
 * Auto-backup module — copies the database to Google Drive every N days.
 *
 * Strategy:
 *  1. On app startup, check the last backup timestamp (stored in store_settings).
 *  2. If >= 3 days since last backup → copy DB file to Google Drive folder.
 *  3. Keep the last 5 backups; delete older ones.
 *
 * Google Drive Desktop path detection:
 *  - Searches common mount points: G:\My Drive, D:\My Drive, etc.
 *  - Falls back to %USERPROFILE%\Google Drive
 */
import fs from 'fs'
import path from 'path'
import { getDbPath } from './connection'
import { queryOne, execute } from './connection'

const BACKUP_INTERVAL_DAYS = 3
const MAX_BACKUPS = 5
const BACKUP_FOLDER_NAME = 'ShopManagement_Backups'

/** Try to find Google Drive's "My Drive" folder */
function findGoogleDrivePath(): string | null {
  // Common Google Drive mount points on Windows
  const candidates: string[] = []

  // Check all drive letters
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    candidates.push(`${letter}:\\My Drive`)
    candidates.push(`${letter}:\\Google Drive`)
  }

  // Also check user profile
  const userProfile = process.env.USERPROFILE || ''
  if (userProfile) {
    candidates.push(path.join(userProfile, 'Google Drive'))
    candidates.push(path.join(userProfile, 'Google Drive', 'My Drive'))
    candidates.push(path.join(userProfile, 'GoogleDrive'))
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        console.log(`[Backup] Found Google Drive at: ${candidate}`)
        return candidate
      }
    } catch {
      // ignore permission errors etc.
    }
  }

  return null
}

/** Get or create the backup folder inside Google Drive */
function getBackupFolder(drivePath: string): string {
  const backupDir = path.join(drivePath, BACKUP_FOLDER_NAME)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
    console.log(`[Backup] Created backup folder: ${backupDir}`)
  }
  return backupDir
}

/** Check if backup is needed and perform it */
export async function checkAndBackup(): Promise<{ backed: boolean; message: string }> {
  try {
    // 1. Find Google Drive
    const drivePath = findGoogleDrivePath()
    if (!drivePath) {
      return { backed: false, message: 'Google Drive not found on this machine' }
    }

    // 2. Check last backup time
    const row = queryOne("SELECT value FROM store_settings WHERE key = 'last_drive_backup'")
    const lastBackup = row ? new Date(row.value) : new Date(0)
    const now = new Date()
    const daysSince = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSince < BACKUP_INTERVAL_DAYS) {
      const nextIn = Math.ceil(BACKUP_INTERVAL_DAYS - daysSince)
      return { backed: false, message: `Next backup in ~${nextIn} day(s)` }
    }

    // 3. Perform backup
    const dbPath = getDbPath()
    if (!fs.existsSync(dbPath)) {
      return { backed: false, message: 'Database file not found' }
    }

    const backupDir = getBackupFolder(drivePath)
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupFileName = `shop-management_${timestamp}.db`
    const destPath = path.join(backupDir, backupFileName)

    fs.copyFileSync(dbPath, destPath)
    console.log(`[Backup] ✅ Database backed up to: ${destPath}`)

    // 4. Update last backup timestamp
    execute(
      "INSERT OR REPLACE INTO store_settings (key, value) VALUES ('last_drive_backup', ?)",
      [now.toISOString()]
    )

    // 5. Cleanup old backups (keep MAX_BACKUPS)
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('shop-management_') && f.endsWith('.db'))
      .sort()
      .reverse() // newest first

    if (files.length > MAX_BACKUPS) {
      for (const old of files.slice(MAX_BACKUPS)) {
        const oldPath = path.join(backupDir, old)
        fs.unlinkSync(oldPath)
        console.log(`[Backup] 🗑️ Deleted old backup: ${old}`)
      }
    }

    return { backed: true, message: `Backed up to Google Drive: ${backupFileName}` }
  } catch (error: any) {
    console.error('[Backup] Error:', error)
    return { backed: false, message: `Backup failed: ${error.message}` }
  }
}

/** Force a backup right now (manual trigger) */
export async function forceBackup(): Promise<{ backed: boolean; message: string }> {
  try {
    const drivePath = findGoogleDrivePath()
    if (!drivePath) {
      return { backed: false, message: 'Google Drive not found on this machine' }
    }

    const dbPath = getDbPath()
    if (!fs.existsSync(dbPath)) {
      return { backed: false, message: 'Database file not found' }
    }

    const backupDir = getBackupFolder(drivePath)
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupFileName = `shop-management_${timestamp}.db`
    const destPath = path.join(backupDir, backupFileName)

    fs.copyFileSync(dbPath, destPath)

    execute(
      "INSERT OR REPLACE INTO store_settings (key, value) VALUES ('last_drive_backup', ?)",
      [now.toISOString()]
    )

    // Cleanup
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('shop-management_') && f.endsWith('.db'))
      .sort().reverse()
    for (const old of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(backupDir, old))
    }

    return { backed: true, message: `Backed up: ${backupFileName}` }
  } catch (error: any) {
    return { backed: false, message: `Backup failed: ${error.message}` }
  }
}

/** Get backup status info */
export function getBackupStatus(): {
  driveFound: boolean
  drivePath: string | null
  lastBackup: string | null
  nextBackupDays: number | null
} {
  const drivePath = findGoogleDrivePath()
  const row = queryOne("SELECT value FROM store_settings WHERE key = 'last_drive_backup'")
  const lastBackup = row ? row.value : null

  let nextBackupDays: number | null = null
  if (lastBackup) {
    const daysSince = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)
    nextBackupDays = Math.max(0, Math.ceil(BACKUP_INTERVAL_DAYS - daysSince))
  }

  return {
    driveFound: !!drivePath,
    drivePath,
    lastBackup,
    nextBackupDays
  }
}
