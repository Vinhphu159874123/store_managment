import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Edit2, Save, X } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { useToastStore } from '../../stores/toastStore'

export default function ProductDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', category: '', description: '',
    retailPrice: 0, wholesalePrice: 0, costPrice: 0
  })

  useEffect(() => {
    if (id) loadProduct(id)
  }, [id])

  async function loadProduct(productId: string): Promise<void> {
    try {
      const data = await window.api.products.get(productId)
      setProduct(data)
    } catch (error) {
      console.error('Failed to load product:', error)
    } finally {
      setLoading(false)
    }
  }

  function openEdit(): void {
    if (!product) return
    setForm({
      name: product.name || '',
      category: product.category || '',
      description: product.description || '',
      retailPrice: product.retailPrice ?? product.retail_price ?? 0,
      wholesalePrice: product.wholesalePrice ?? product.wholesale_price ?? 0,
      costPrice: product.costPrice ?? product.cost_price ?? 0,
    })
    setEditMode(true)
  }

  function cancelEdit(): void {
    setEditMode(false)
  }

  async function handleSave(): Promise<void> {
    if (!id || !form.name.trim()) {
      addToast('error', 'Vui lòng nhập tên sản phẩm')
      return
    }
    setSaving(true)
    try {
      await window.api.products.update(id, form)
      addToast('success', t('products.updateSuccess'))
      setEditMode(false)
      loadProduct(id)
    } catch (error: any) {
      addToast('error', error.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-page"><div className="loading-spinner" /></div>
  if (!product) return <div className="loading-page"><p>{t('common.noData')}</p></div>

  const rp = product.retailPrice    ?? product.retail_price    ?? 0
  const wp = product.wholesalePrice ?? product.wholesale_price ?? 0
  const cp = product.costPrice      ?? product.cost_price      ?? 0

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="flex-row">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/products')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{product.name}</h1>
            <p className="page-subtitle">{product.code}</p>
          </div>
        </div>
        <div className="page-actions">
          {editMode ? (
            <>
              <button className="btn btn-secondary" onClick={cancelEdit}>
                <X size={16} /> {t('common.cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <div className="loading-spinner" style={{ width: 15, height: 15, borderWidth: 2 }} />
                  : <Save size={16} />}
                {t('common.save')}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={openEdit}>
              <Edit2 size={16} /> {t('common.edit')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        {/* ── Product Info / Edit Form ─────────────────────────────────────── */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
            {t('products.productDetail')}
          </h3>

          {editMode ? (
            /* ── EDIT FORM ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label required">{t('products.name')}</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('products.category')}</label>
                  <input
                    className="form-input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="VD: Vật liệu xây dựng"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('products.description')}</label>
                  <input
                    className="form-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">{t('products.retailPrice')}</label>
                  <input
                    className="form-input"
                    type="number" min="0"
                    value={form.retailPrice || ''}
                    onChange={(e) => setForm({ ...form, retailPrice: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">{t('products.wholesalePrice')}</label>
                  <input
                    className="form-input"
                    type="number" min="0"
                    value={form.wholesalePrice || ''}
                    onChange={(e) => setForm({ ...form, wholesalePrice: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('products.costPrice')}</label>
                <input
                  className="form-input"
                  type="number" min="0"
                  value={form.costPrice || ''}
                  onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
          ) : (
            /* ── VIEW MODE ── */
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">{t('products.code')}</span>
                <span className="detail-value">{product.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('products.category')}</span>
                <span className="detail-value">{product.category || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('products.retailPrice')}</span>
                <span className="detail-value currency">{formatCurrency(rp)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('products.wholesalePrice')}</span>
                <span className="detail-value currency">{formatCurrency(wp)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('products.costPrice')}</span>
                <span className="detail-value currency" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatCurrency(cp)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('products.description')}</span>
                <span className="detail-value">{product.description || '—'}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Price History ─────────────────────────────────────────────────── */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
            {t('products.priceHistory')}
          </h3>
          {product.priceHistory && product.priceHistory.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('common.date')}</th>
                    <th>{t('products.retailPrice')}</th>
                    <th>{t('products.wholesalePrice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.priceHistory.map((ph: any) => (
                    <tr key={ph.id}>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(ph.changedAt)}</td>
                      <td>
                        <span style={{ color: 'var(--color-text-muted)', textDecoration: 'line-through', marginRight: 'var(--space-2)' }}>
                          {formatCurrency(ph.oldRetailPrice)}
                        </span>
                        <span className="currency">{formatCurrency(ph.newRetailPrice)}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-text-muted)', textDecoration: 'line-through', marginRight: 'var(--space-2)' }}>
                          {formatCurrency(ph.oldWholesalePrice)}
                        </span>
                        <span className="currency">{formatCurrency(ph.newWholesalePrice)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-empty"><p>{t('common.noData')}</p></div>
          )}
        </div>
      </div>
    </div>
  )
}
