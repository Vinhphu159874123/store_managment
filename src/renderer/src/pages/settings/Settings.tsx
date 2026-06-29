import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, Database, Upload, RefreshCw } from 'lucide-react'
import { useToastStore } from '../../stores/toastStore'
import { formatFileSize, formatDate } from '../../utils/formatters'

export default function Settings(): JSX.Element {
  const { t, i18n } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  const [settings, setSettings] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_tax_code: '',
    language: 'vi'
  })
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
    loadBackups()
  }, [])

  async function loadSettings(): Promise<void> {
    try {
      const data = await window.api.settings.getAll()
      setSettings({
        store_name: data.store_name || '',
        store_address: data.store_address || '',
        store_phone: data.store_phone || '',
        store_tax_code: data.store_tax_code || '',
        language: data.language || 'vi'
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadBackups(): Promise<void> {
    try {
      const data = await window.api.backup.list()
      setBackups(data)
    } catch (error) {
      console.error('Failed to load backups:', error)
    }
  }

  async function handleSave(): Promise<void> {
    try {
      await window.api.settings.setMany(settings)
      i18n.changeLanguage(settings.language)
      addToast('success', t('settings.saveSuccess'))
    } catch (error: any) {
      addToast('error', error.message)
    }
  }

  async function handleBackup(): Promise<void> {
    try {
      const result = await window.api.backup.create()
      if (result.success) {
        addToast('success', t('settings.backupSuccess'))
        loadBackups()
      } else {
        addToast('error', result.error || t('common.error'))
      }
    } catch (error: any) {
      addToast('error', error.message)
    }
  }

  async function handleRestore(): Promise<void> {
    try {
      const result = await window.api.backup.restore()
      if (result.success) {
        addToast('success', t('settings.restoreSuccess'))
      } else if (result.error !== 'cancelled') {
        addToast('error', result.error || t('common.error'))
      }
    } catch (error: any) {
      addToast('error', error.message)
    }
  }

  if (loading) return <div className="loading-page"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('settings.title')}</h1>
      </div>

      <div className="grid grid-2">
        {/* Store Info */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
            {t('settings.storeInfo')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">{t('settings.storeName')}</label>
              <input className="form-input" value={settings.store_name} onChange={(e) => setSettings({ ...settings, store_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('settings.storeAddress')}</label>
              <input className="form-input" value={settings.store_address} onChange={(e) => setSettings({ ...settings, store_address: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('settings.storePhone')}</label>
                <input className="form-input" value={settings.store_phone} onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('settings.storeTaxCode')}</label>
                <input className="form-input" value={settings.store_tax_code} onChange={(e) => setSettings({ ...settings, store_tax_code: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('settings.language')}</label>
              <select className="form-input" value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={16} />
              {t('common.save')}
            </button>
          </div>
        </div>

        {/* Backup */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
            {t('settings.backup')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" onClick={handleBackup} style={{ flex: 1 }}>
                <Database size={16} />
                {t('settings.createBackup')}
              </button>
              <button className="btn btn-secondary" onClick={handleRestore} style={{ flex: 1 }}>
                <Upload size={16} />
                {t('settings.restoreBackup')}
              </button>
            </div>

            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                {t('settings.backupList')}
              </h4>
              {backups.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '300px', overflowY: 'auto' }}>
                  {backups.map((b) => (
                    <div key={b.name} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--color-bg-primary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{b.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {formatDate(b.date)}
                        </div>
                      </div>
                      <span style={{ color: 'var(--color-text-muted)' }}>{formatFileSize(b.size)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="table-empty" style={{ padding: 'var(--space-6)' }}>
                  <p>{t('common.noData')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <div className="flex-between">
          <div>
            <h3 className="card-title">{t('settings.about')}</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
              Desktop Sales & Invoice Management System
            </p>
          </div>
          <span className="badge badge-success">{t('settings.version')} 1.0.0</span>
        </div>
      </div>
    </div>
  )
}
