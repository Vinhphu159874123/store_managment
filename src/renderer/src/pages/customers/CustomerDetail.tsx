import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Edit2, Save, X, Plus } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { useToastStore } from '../../stores/toastStore'
import Modal from '../../components/ui/Modal'

export default function CustomerDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Edit state
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', address: '', taxCode: '',
    companyName: '', email: '', notes: ''
  })

  useEffect(() => {
    if (id) loadCustomer(id)
  }, [id])

  async function loadCustomer(customerId: string): Promise<void> {
    try {
      const data = await window.api.customers.get(customerId)
      setCustomer(data)
    } catch (error) {
      console.error('Failed to load customer:', error)
    } finally {
      setLoading(false)
    }
  }

  function openEdit(): void {
    if (!customer) return
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      taxCode: customer.tax_code || customer.taxCode || '',
      companyName: customer.company_name || customer.companyName || '',
      email: customer.email || '',
      notes: customer.notes || ''
    })
    setShowEdit(true)
  }

  async function handleSave(): Promise<void> {
    if (!id || !form.name.trim()) {
      addToast('error', 'Vui lòng nhập tên khách hàng')
      return
    }
    if (form.phone && !/^0\d{9}$/.test(form.phone)) {
      addToast('error', 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0')
      return
    }
    setSaving(true)
    try {
      await window.api.customers.update(id, form)
      addToast('success', t('customers.updateSuccess'))
      setShowEdit(false)
      loadCustomer(id)
    } catch (error: any) {
      addToast('error', error.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-page"><div className="loading-spinner" /></div>
  if (!customer) return <div className="loading-page"><p>{t('common.noData')}</p></div>

  // Defensive field reader — backend returns snake_case
  const f = (camel: string, snake: string) =>
    customer[camel] !== undefined ? customer[camel] : customer[snake]

  const invoices: any[] = customer.invoices || []
  const payments: any[] = customer.payments || []

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="flex-row">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/customers')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{customer.name}</h1>
            <p className="page-subtitle">{customer.code}</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/invoices/create?customer=${id}`)}>
            <Plus size={16} /> Tạo hóa đơn
          </button>
          <button className="btn btn-secondary" onClick={openEdit}>
            <Edit2 size={16} /> Chỉnh sửa
          </button>
        </div>
      </div>

      {/* ── Customer Info ──────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
          {t('customers.customerDetail')}
        </h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">{t('customers.phone')}</span>
            <span className="detail-value">{customer.phone || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">{t('common.email')}</span>
            <span className="detail-value">{customer.email || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">{t('customers.address')}</span>
            <span className="detail-value">{customer.address || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">{t('customers.companyName')}</span>
            <span className="detail-value">{f('companyName', 'company_name') || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">{t('customers.taxCode')}</span>
            <span className="detail-value">{f('taxCode', 'tax_code') || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">{t('common.notes')}</span>
            <span className="detail-value">{customer.notes || '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Invoice & Payment History ──────────────────────────────────────── */}
      <div className="grid grid-2">
        {/* Invoice History */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
            {t('customers.invoiceHistory')}
          </h3>
          <div className="table-scroll" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('invoices.invoiceNumber')}</th>
                  <th>{t('invoices.totalAmount')}</th>
                  <th>{t('invoices.debtAmount')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.date')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => {
                  // Backend returns snake_case — map defensively
                  const invNum    = inv.invoiceNumber  ?? inv.invoice_number  ?? ''
                  const invTotal  = inv.totalAmount    ?? inv.total_amount    ?? 0
                  const invDebt   = inv.debtAmount     ?? inv.debt_amount     ?? 0
                  const invDate   = inv.createdAt      ?? inv.created_at      ?? ''
                  const invStatus = inv.status         ?? 'completed'
                  const isCancelled = invStatus === 'cancelled'
                  return (
                    <tr key={inv.id} className="clickable-row" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td style={{ fontWeight: 500, textDecoration: isCancelled ? 'line-through' : 'none', color: isCancelled ? 'var(--color-text-muted)' : undefined }}>
                        {invNum}
                      </td>
                      <td className="currency" style={{ textDecoration: isCancelled ? 'line-through' : 'none', color: isCancelled ? 'var(--color-text-muted)' : undefined }}>
                        {formatCurrency(invTotal)}
                      </td>
                      <td className={`currency ${!isCancelled && invDebt > 0 ? 'currency-negative' : ''}`} style={{ color: isCancelled ? 'var(--color-text-muted)' : undefined }}>
                        {isCancelled ? '—' : invDebt > 0 ? formatCurrency(invDebt) : '—'}
                      </td>
                      <td>
                        <span className={`badge ${isCancelled ? 'badge-danger' : 'badge-success'}`}>
                          {isCancelled ? t('invoices.cancelled') : t('invoices.completed')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(invDate)}</td>
                    </tr>
                  )
                })}
                {invoices.length === 0 && (
                  <tr><td colSpan={5} className="table-empty">{t('common.noData')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Tổng nợ dưới bảng */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginRight: 'var(--space-2)' }}>
              {t('customers.totalDebt')}:
            </span>
            <span className="currency currency-negative" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
              {formatCurrency(customer.totalDebt || 0)}
            </span>
          </div>
        </div>

        {/* Payment History */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
            {t('customers.paymentHistory')}
          </h3>
          <div className="table-scroll" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('invoices.paidAmount')}</th>
                  <th>{t('invoices.paymentMethod')}</th>
                  <th>{t('common.notes')}</th>
                  <th>{t('common.date')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => {
                  const method = p.paymentMethod ?? p.payment_method
                  const date   = p.createdAt     ?? p.created_at
                  return (
                    <tr key={p.id}>
                      <td className="currency currency-positive">{formatCurrency(p.amount)}</td>
                      <td>
                        <span className="badge badge-info">
                          {method === 'cash' ? t('invoices.cash') : method === 'transfer' ? t('invoices.transfer') : t('invoices.other')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{p.notes || '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(date)}</td>
                    </tr>
                  )
                })}
                {payments.length === 0 && (
                  <tr><td colSpan={4} className="table-empty">{t('common.noData')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title={t('customers.editCustomer')}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>
              <X size={15} /> {t('common.cancel')}
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving
                ? <div className="loading-spinner" style={{ width: 15, height: 15, borderWidth: 2 }} />
                : <Save size={15} />}
              {t('common.save')}
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
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('common.email')}</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('common.notes')}</label>
              <input
                className="form-input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
