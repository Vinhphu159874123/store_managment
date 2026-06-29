import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { useToastStore } from '../../stores/toastStore'
import Modal from '../../components/ui/Modal'
export default function CustomerList(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    taxCode: '',
    companyName: '',
    email: '',
    notes: ''
  })

  const loadCustomers = useCallback(async () => {
    try {
      const data = await window.api.customers.list(search || undefined)
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load customers:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => loadCustomers(), 300)
    return () => clearTimeout(timer)
  }, [loadCustomers])

  function openCreateForm(): void {
    setEditingCustomer(null)
    setForm({ name: '', phone: '', address: '', taxCode: '', companyName: '', email: '', notes: '' })
    setShowForm(true)
  }

  function openEditForm(customer: any): void {
    setEditingCustomer(customer)
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      taxCode: customer.tax_code || '',
      companyName: customer.company_name || '',
      email: customer.email || '',
      notes: customer.notes || ''
    })
    setShowForm(true)
  }

  async function handleSubmit(): Promise<void> {
    try {
      if (!form.name.trim()) {
        addToast('error', 'Vui lòng nhập tên khách hàng')
        return
      }
      if (form.phone && !/^0\d{9}$/.test(form.phone)) {
        addToast('error', 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0')
        return
      }
      if (editingCustomer) {
        await window.api.customers.update(editingCustomer.id, form)
        addToast('success', t('customers.updateSuccess'))
      } else {
        // Auto-generate code from timestamp
        const autoCode = `KH${Date.now().toString().slice(-6)}`
        await window.api.customers.create({ ...form, code: autoCode })
        addToast('success', t('customers.createSuccess'))
      }
      setShowForm(false)
      loadCustomers()
    } catch (error: any) {
      addToast('error', error.message || t('common.error'))
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await window.api.customers.delete(id)
      addToast('success', t('customers.deleteSuccess'))
      setConfirmDelete(null)
      loadCustomers()
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
          <h1 className="page-title">{t('customers.title')}</h1>
          <p className="page-subtitle">{customers.length} khách hàng</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateForm}>
            <Plus size={16} />
            {t('customers.addCustomer')}
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search className="search-icon" size={15} />
            <input
              type="text"
              placeholder={t('customers.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('customers.name')}</th>
                <th>{t('customers.phone')}</th>
                <th>{t('customers.address')}</th>
                <th>{t('customers.companyName')}</th>
                <th style={{ width: '110px' }}>{t('customers.totalDebt')}</th>
                <th style={{ width: '80px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="clickable-row"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{customer.name}</td>
                  <td>{customer.phone || '—'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {customer.address || '—'}
                  </td>
                  <td>{customer.company_name || '—'}</td>
                  <td className={`currency ${(customer.total_debt || 0) > 0 ? 'currency-negative' : 'currency'}`}>
                    {(customer.total_debt || 0) > 0 ? formatCurrency(customer.total_debt) : '—'}
                  </td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="action-btn" title={t('common.edit')} onClick={() => openEditForm(customer)}>
                        <Pencil size={15} />
                      </button>
                      <button className="action-btn danger" title={t('common.delete')} onClick={() => setConfirmDelete(customer.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <Users className="table-empty-icon" size={40} />
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
        title={editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingCustomer ? t('common.update') : t('common.save')}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">{t('customers.name')}</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('customers.phone')}</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0901234567"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('customers.address')}</label>
            <input
              className="form-input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="VD: 123 Đường ABC, TP.HCM"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('customers.companyName')}</label>
              <input
                className="form-input"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('customers.taxCode')}</label>
              <input
                className="form-input"
                value={form.taxCode}
                onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('common.notes')}</label>
            <textarea
              className="form-input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Ghi chú thêm..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={t('common.confirm')}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              {t('common.cancel')}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              {t('common.confirm')}
            </button>
          </>
        }
      >
        <p>{t('customers.confirmDelete')}</p>
      </Modal>
    </div>
  )
}
