import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, Package } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { useToastStore } from '../../stores/toastStore'
import Modal from '../../components/ui/Modal'

export default function ProductList(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    retailPrice: 0,
    wholesalePrice: 0,
    costPrice: 0
  })

  const loadProducts = useCallback(async () => {
    try {
      const data = await window.api.products.list(search || undefined)
      setProducts(data)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 300)
    return () => clearTimeout(timer)
  }, [loadProducts])

  function openCreateForm(): void {
    setEditingProduct(null)
    setForm({ name: '', category: '', description: '', retailPrice: 0, wholesalePrice: 0, costPrice: 0 })
    setShowForm(true)
  }

  function openEditForm(product: any): void {
    setEditingProduct(product)
    setForm({
      name: product.name,
      category: product.category || '',
      description: product.description || '',
      retailPrice: product.retail_price ?? product.retailPrice ?? 0,
      wholesalePrice: product.wholesale_price ?? product.wholesalePrice ?? 0,
      costPrice: product.cost_price ?? product.costPrice ?? 0
    })
    setShowForm(true)
  }

  async function handleSubmit(): Promise<void> {
    try {
      if (!form.name.trim()) {
        addToast('error', 'Vui lòng nhập tên sản phẩm')
        return
      }

      if (editingProduct) {
        await window.api.products.update(editingProduct.id, form)
        addToast('success', t('products.updateSuccess'))
      } else {
        await window.api.products.create(form)
        addToast('success', t('products.createSuccess'))
      }

      setShowForm(false)
      loadProducts()
    } catch (error: any) {
      addToast('error', error.message || t('common.error'))
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await window.api.products.delete(id)
      addToast('success', t('products.deleteSuccess'))
      setConfirmDelete(null)
      loadProducts()
    } catch (error: any) {
      addToast('error', error.message || t('common.error'))
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('products.title')}</h1>
          <p className="page-subtitle">{products.length} {t('nav.products').toLowerCase()}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateForm}>
            <Plus size={18} />
            {t('products.addProduct')}
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder={t('products.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('products.code')}</th>
                <th>{t('products.name')}</th>
                <th>{t('products.category')}</th>
                <th>{t('products.retailPrice')}</th>
                <th>{t('products.wholesalePrice')}</th>
                <th>{t('products.costPrice')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="clickable-row"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <td style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-accent)' }}>
                    {product.code}
                  </td>
                  <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{product.name}</td>
                  <td>
                    {product.category ? (
                      <span className="badge badge-info">{product.category}</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="currency">{formatCurrency(product.retail_price ?? product.retailPrice ?? 0)}</td>
                  <td className="currency">{formatCurrency(product.wholesale_price ?? product.wholesalePrice ?? 0)}</td>
                  <td className="currency" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatCurrency(product.cost_price ?? product.costPrice ?? 0)}
                  </td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="action-btn danger"
                        title={t('common.delete')}
                        onClick={() => setConfirmDelete(product.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty">
                      <Package className="table-empty-icon" size={48} />
                      <p>{t('common.noData')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingProduct ? t('products.editProduct') : t('products.addProduct')}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingProduct ? t('common.update') : t('common.save')}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label required">{t('products.name')}</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Xi măng Hà Tiên"
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

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label required">{t('products.retailPrice')}</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.retailPrice || ''}
                onChange={(e) => setForm({ ...form, retailPrice: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label required">{t('products.wholesalePrice')}</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.wholesalePrice || ''}
                onChange={(e) => setForm({ ...form, wholesalePrice: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('products.costPrice')}</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.costPrice || ''}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={t('common.confirm')}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              {t('common.confirm')}
            </button>
          </>
        }
      >
        <p>{t('products.confirmDelete')}</p>
      </Modal>
    </div>
  )
}
