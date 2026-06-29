import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, XCircle, Download, Edit2, CheckCircle,
  Clock, ChevronDown, ChevronUp, Save, X,
  Trash2, Search, ShoppingCart, PackagePlus, Eye
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { useToastStore } from '../../stores/toastStore'
import Modal from '../../components/ui/Modal'
import { pdf } from '@react-pdf/renderer'
import InvoicePDF from '../../components/pdf/InvoicePDF'

// ─── Defensive field reader (handles snake_case or camelCase from backend) ───
function field(obj: any, camel: string, snake: string): any {
  if (obj == null) return undefined
  return obj[camel] !== undefined ? obj[camel] : obj[snake]
}

function mapInvoiceItem(item: any) {
  return {
    id: item.id,
    productId: field(item, 'productId', 'product_id') || '',
    productNameSnapshot: field(item, 'productNameSnapshot', 'product_name_snapshot') || '',
    unitNameSnapshot: field(item, 'unitNameSnapshot', 'unit_name_snapshot') || '',
    quantity: Number(field(item, 'quantity', 'quantity') ?? 1),
    unitPrice: Number(field(item, 'unitPrice', 'unit_price') ?? 0),
    discountPercent: Number(field(item, 'discountPercent', 'discount_percent') ?? 0),
    discountAmount: Number(field(item, 'discountAmount', 'discount_amount') ?? 0),
    lineTotal: Number(field(item, 'lineTotal', 'line_total') ?? 0),
  }
}

function mapInvoice(inv: any) {
  if (!inv) return null
  return {
    id: inv.id,
    invoiceNumber: field(inv, 'invoiceNumber', 'invoice_number'),
    customerId: field(inv, 'customerId', 'customer_id'),
    customerNameSnapshot: field(inv, 'customerNameSnapshot', 'customer_name_snapshot'),
    customerPhoneSnapshot: field(inv, 'customerPhoneSnapshot', 'customer_phone_snapshot'),
    customerAddressSnapshot: field(inv, 'customerAddressSnapshot', 'customer_address_snapshot'),
    saleType: field(inv, 'saleType', 'sale_type'),
    subtotal: Number(field(inv, 'subtotal', 'subtotal') ?? 0),
    discountAmount: Number(field(inv, 'discountAmount', 'discount_amount') ?? 0),
    totalAmount: Number(field(inv, 'totalAmount', 'total_amount') ?? 0),
    paidAmount: Number(field(inv, 'paidAmount', 'paid_amount') ?? 0),
    debtAmount: Number(field(inv, 'debtAmount', 'debt_amount') ?? 0),
    status: inv.status,
    notes: inv.notes || '',
    createdAt: field(inv, 'createdAt', 'created_at'),
    updatedAt: field(inv, 'updatedAt', 'updated_at'),
    items: (inv.items || []).map(mapInvoiceItem),
    payments: inv.payments || [],
    editHistory: (inv.editHistory || inv.edit_history || []).map((h: any) => ({
      id: h.id,
      changeSummary: field(h, 'changeSummary', 'change_summary') || '',
      changedAt: field(h, 'changedAt', 'changed_at') || '',
      snapshotJson: field(h, 'snapshotJson', 'snapshot_json') || null,
    }))
  }
}

// ─── Edit-mode line item ───────────────────────────────────────────────────
interface EditItem {
  productId: string
  productNameSnapshot: string
  unitNameSnapshot: string
  quantity: number
  unitPrice: number
  discountPercent: number
  discountAmount: number
  lineTotal: number
}

export default function InvoiceDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({})

  // Modals
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [paymentNotes, setPaymentNotes] = useState('')

  // History
  const [showHistory, setShowHistory] = useState(true)
  const [historyDetailItem, setHistoryDetailItem] = useState<any>(null)

  // Invoice preview
  const [showPreview, setShowPreview] = useState(false)

  // ── EDIT MODE ─────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [editItems, setEditItems] = useState<EditItem[]>([])
  const [editDiscount, setEditDiscount] = useState(0)
  const [editPaid, setEditPaid] = useState(0)
  const [editNotes, setEditNotes] = useState('')
  const [editSaleType, setEditSaleType] = useState<'retail' | 'wholesale'>('retail')
  const [editCustomerId, setEditCustomerId] = useState('')
  const [editCustomerSearch, setEditCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [showCustomerDd, setShowCustomerDd] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductDd, setShowProductDd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickForm, setQuickForm] = useState({ name: '', category: '', retailPrice: 0, wholesalePrice: 0, costPrice: 0 })
  const [savingProduct, setSavingProduct] = useState(false)
  // Original snapshot for dirty-check
  const [originalSnapshot, setOriginalSnapshot] = useState<string>('')

  // ── derived: is the edit form actually changed? ────────────────────────────
  const isDirty = editMode && originalSnapshot !== JSON.stringify({
    items: editItems, discount: editDiscount, paid: editPaid,
    notes: editNotes, saleType: editSaleType, customerId: editCustomerId
  })

  useEffect(() => {
    if (id) loadInvoice(id)
    loadSettings()
  }, [id])

  async function loadInvoice(invoiceId: string): Promise<void> {
    try {
      const raw = await window.api.invoices.get(invoiceId)
      setInvoice(mapInvoice(raw))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadSettings(): Promise<void> {
    const s = await window.api.settings.getAll()
    setStoreSettings(s)
  }

  // Enter edit mode — pre-populate fields
  function enterEditMode(): void {
    if (!invoice) return
    const items = invoice.items.map((it: any) => ({ ...it }))
    setEditItems(items)
    setEditDiscount(invoice.discountAmount)
    setEditPaid(invoice.paidAmount)
    setEditNotes(invoice.notes)
    setEditSaleType(invoice.saleType || 'retail')
    setEditCustomerId(invoice.customerId || '')
    setEditCustomerSearch(invoice.customerNameSnapshot || '')
    // snapshot for dirty check
    setOriginalSnapshot(JSON.stringify({
      items, discount: invoice.discountAmount, paid: invoice.paidAmount,
      notes: invoice.notes, saleType: invoice.saleType, customerId: invoice.customerId || ''
    }))
    setEditMode(true)
    setProductSearch('')
  }

  function cancelEdit(): void {
    setEditMode(false)
    setProductSearch('')
  }

  // Customer search for edit mode
  useEffect(() => {
    if (!editMode) return
    const t2 = setTimeout(async () => {
      const data = await window.api.customers.list(editCustomerSearch || undefined)
      setCustomers(Array.isArray(data) ? data : [])
    }, 200)
    return () => clearTimeout(t2)
  }, [editCustomerSearch, editMode])

  // Product search for edit mode
  useEffect(() => {
    if (!editMode) return
    const t2 = setTimeout(async () => {
      if (productSearch.trim()) {
        const data = await window.api.products.list(productSearch)
        setProducts(Array.isArray(data) ? data : [])
      } else setProducts([])
    }, 200)
    return () => clearTimeout(t2)
  }, [productSearch, editMode])

  function addProductToEdit(product: any): void {
    const price = editSaleType === 'retail'
      ? (product.retail_price ?? product.retailPrice ?? 0)
      : (product.wholesale_price ?? product.wholesalePrice ?? 0)
    const exists = editItems.find(i => i.productId === product.id)
    if (exists) {
      setEditItems(editItems.map(i =>
        i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.unitPrice * (1 - i.discountPercent / 100) }
          : i
      ))
    } else {
      setEditItems([...editItems, {
        productId: product.id, productNameSnapshot: product.name, unitNameSnapshot: '',
        quantity: 1, unitPrice: price, discountPercent: 0, discountAmount: 0, lineTotal: price
      }])
    }
    setProductSearch('')
    setShowProductDd(false)
  }

  function updateEditItem(index: number, field2: string, value: number): void {
    setEditItems(editItems.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field2]: value }
      const disc = (updated.unitPrice * updated.quantity * updated.discountPercent) / 100
      updated.discountAmount = disc
      updated.lineTotal = updated.unitPrice * updated.quantity - disc
      return updated
    }))
  }

  function removeEditItem(index: number): void {
    setEditItems(editItems.filter((_, i) => i !== index))
  }

  const editSubtotal = editItems.reduce((s, i) => s + i.lineTotal, 0)
  const editTotal = editSubtotal - editDiscount
  const editDebt = Math.max(0, editTotal - editPaid)

  async function handleSaveEdit(): Promise<void> {
    if (!id) return
    if (editItems.length === 0) { addToast('error', t('invoices.noItems')); return }
    setSaving(true)
    try {
      await window.api.invoices.update(id, {
        customerId: editCustomerId || undefined,
        saleType: editSaleType,
        discountAmount: editDiscount,
        paidAmount: editPaid,
        notes: editNotes,
        items: editItems
      })
      addToast('success', 'Đã lưu thay đổi hóa đơn!')
      setEditMode(false)
      loadInvoice(id)
    } catch (error: any) {
      addToast('error', error.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function openQuickAddProduct(): Promise<void> {
    setQuickForm({ name: productSearch, category: '', retailPrice: 0, wholesalePrice: 0, costPrice: 0 })
    setShowProductDd(false)
    setShowQuickAdd(true)
  }

  async function handleQuickSaveProduct(): Promise<void> {
    if (!quickForm.name.trim()) { addToast('error', 'Vui lòng nhập tên sản phẩm'); return }
    setSavingProduct(true)
    try {
      const result = await window.api.products.create({
        code: `SP${Date.now().toString().slice(-6)}`,
        name: quickForm.name, category: quickForm.category, description: '',
        retailPrice: quickForm.retailPrice, wholesalePrice: quickForm.wholesalePrice, costPrice: quickForm.costPrice
      })
      const price = editSaleType === 'retail' ? quickForm.retailPrice : quickForm.wholesalePrice
      setEditItems([...editItems, {
        productId: result.id, productNameSnapshot: quickForm.name, unitNameSnapshot: '',
        quantity: 1, unitPrice: price, discountPercent: 0, discountAmount: 0, lineTotal: price
      }])
      addToast('success', `Đã tạo và thêm "${quickForm.name}"`)
      setShowQuickAdd(false)
      setProductSearch('')
    } catch (e: any) {
      addToast('error', e.message)
    } finally {
      setSavingProduct(false)
    }
  }

  // ── Other actions ──────────────────────────────────────────────────────────
  async function handleCancel(): Promise<void> {
    if (!id) return
    try {
      await window.api.invoices.cancel(id)
      addToast('success', t('invoices.cancelSuccess'))
      setShowCancelConfirm(false)
      loadInvoice(id)
    } catch (error: any) { addToast('error', error.message) }
  }

  async function handleConfirm(): Promise<void> {
    if (!id) return
    try {
      await window.api.invoices.confirm(id)
      addToast('success', 'Hóa đơn đã được xác nhận!')
      setShowConfirmModal(false)
      loadInvoice(id)
    } catch (error: any) { addToast('error', error.message) }
  }

  async function handlePayment(): Promise<void> {
    if (!id || !invoice) return
    try {
      await window.api.payments.create({
        invoiceId: id, customerId: invoice.customerId,
        amount: paymentAmount, paymentMethod, notes: paymentNotes
      })
      addToast('success', t('invoices.paymentSuccess'))
      setShowPayment(false)
      setPaymentAmount(0)
      setPaymentNotes('')
      loadInvoice(id)
    } catch (error: any) { addToast('error', error.message) }
  }

  async function handleExportPDF(): Promise<void> {
    if (!invoice) return
    try {
      const blob = await pdf(<InvoicePDF invoice={invoice} storeSettings={storeSettings} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${invoice.invoiceNumber}.pdf`; a.click()
      URL.revokeObjectURL(url)
      addToast('success', 'PDF exported')
    } catch (error: any) { addToast('error', error.message) }
  }

  function formatTS(ts: string): string {
    if (!ts) return ''
    try {
      const d = new Date(ts.replace(' ', 'T'))
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
    } catch { return ts }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return <div className="loading-page"><div className="loading-spinner" /></div>
  if (!invoice) return <div className="loading-page"><p>{t('common.noData')}</p></div>

  const isDraft = invoice.status === 'draft'
  const isCompleted = invoice.status === 'completed'
  const isCancelled = invoice.status === 'cancelled'
  const editHistory: any[] = invoice.editHistory || []

  const ddStyle: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
    background: '#fff', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', maxHeight: '240px', overflowY: 'auto',
    zIndex: 300, boxShadow: 'var(--shadow-lg)'
  }

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="flex-row">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{invoice.invoiceNumber}</h1>
            <p className="page-subtitle">
              {invoice.customerNameSnapshot || t('customers.walkIn')} • {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>

        <div className="page-actions">
          {editMode ? (
            <>
              <button className="btn btn-secondary" onClick={cancelEdit}>
                <X size={16} /> Hủy chỉnh sửa
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving || editItems.length === 0 || !isDirty}>
                {saving ? <div className="loading-spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> : <Save size={16} />}
                Lưu thay đổi
              </button>
            </>
          ) : (
            <>
              {!isCancelled && (
                <button className="btn btn-secondary" onClick={enterEditMode}>
                  <Edit2 size={16} /> Chỉnh sửa
                </button>
              )}
              {isDraft && (
                <button className="btn btn-primary" style={{ background: 'var(--color-success,#16a34a)', borderColor: 'var(--color-success,#16a34a)' }} onClick={() => setShowConfirmModal(true)}>
                  <CheckCircle size={16} /> Xác nhận hóa đơn
                </button>
              )}
              {isCompleted && invoice.debtAmount > 0 && (
                <button className="btn btn-primary" onClick={() => { setPaymentAmount(invoice.debtAmount); setShowPayment(true) }}>
                  {t('invoices.addPayment')}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setShowPreview(true)}>
                <Eye size={16} /> Xem trước
              </button>
              <button className="btn btn-secondary" onClick={handleExportPDF}>
                <Download size={16} /> {t('invoices.exportPDF')}
              </button>
              {!isCancelled && (
                <button className="btn btn-danger" onClick={() => setShowCancelConfirm(true)}>
                  <XCircle size={16} /> {t('invoices.cancelInvoice')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Draft banner ────────────────────────────────────────────────── */}
      {isDraft && !editMode && (
        <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 10, color: '#92400e', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
          <Clock size={16} style={{ color: '#d97706', flexShrink: 0 }} />
          Hóa đơn đang ở trạng thái <strong>Nháp</strong>. Nhấn "Xác nhận hóa đơn" để hoàn thành.
        </div>
      )}

      {/* ── Edit banner ─────────────────────────────────────────────────── */}
      {editMode && (
        <div style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-accent)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
          <Edit2 size={15} style={{ flexShrink: 0 }} />
          Đang chỉnh sửa hóa đơn. Nhấn <strong>Lưu thay đổi</strong> để xác nhận hoặc <strong>Hủy</strong> để bỏ qua.
        </div>
      )}

      {/* ════════════════ VIEW MODE ════════════════════════════════════════ */}
      {!editMode && (
        <>
          <div className="grid grid-2" style={{ marginBottom: 'var(--space-6)' }}>
            {/* Invoice Info */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>{t('invoices.invoiceDetail')}</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">{t('invoices.customer')}</span>
                  <span className="detail-value">
                    {invoice.customerId ? (
                      <span
                        style={{ color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 500 }}
                        onClick={() => navigate(`/customers/${invoice.customerId}`)}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        {invoice.customerNameSnapshot || t('customers.walkIn')}
                      </span>
                    ) : (
                      invoice.customerNameSnapshot || t('customers.walkIn')
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t('common.phone')}</span>
                  <span className="detail-value">{invoice.customerPhoneSnapshot || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t('invoices.saleType')}</span>
                  <span className="detail-value">
                    <span className={`badge ${invoice.saleType === 'retail' ? 'badge-info' : 'badge-primary'}`}>
                      {invoice.saleType === 'retail' ? t('invoices.retail') : t('invoices.wholesale')}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t('common.status')}</span>
                  <span className="detail-value">
                    <span className={`badge ${invoice.status === 'completed' ? 'badge-success' : invoice.status === 'draft' ? 'badge-warning' : 'badge-danger'}`}>
                      {invoice.status === 'completed' ? t('invoices.completed') : invoice.status === 'draft' ? 'Nháp' : t('invoices.cancelled')}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>{t('invoices.totalAmount')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="flex-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>{t('invoices.subtotal')}</span>
                  <span className="currency">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{t('invoices.totalDiscount')}</span>
                    <span className="currency" style={{ color: 'var(--color-warning)' }}>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex-between" style={{ padding: 'var(--space-2)', background: 'var(--color-accent-light)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{t('invoices.totalAmount')}</span>
                  <span className="currency" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-accent)', fontWeight: 700 }}>{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>{t('invoices.paidAmount')}</span>
                  <span className="currency currency-positive">{formatCurrency(invoice.paidAmount)}</span>
                </div>
                {invoice.debtAmount > 0 && (
                  <div className="flex-between" style={{ padding: 'var(--space-2)', background: 'var(--color-danger-light)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{t('invoices.debtAmount')}</span>
                    <span className="currency currency-negative" style={{ fontSize: 'var(--font-size-lg)' }}>{formatCurrency(invoice.debtAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items table — VIEW */}
          <div className="table-container" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('invoices.product')}</th>
                    <th>{t('invoices.quantity')}</th>
                    <th style={{ width: 70 }}>ĐVT</th>
                    <th>{t('invoices.unitPrice')}</th>
                    <th>{t('invoices.discountPercent')}</th>
                    <th>{t('invoices.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item: any, i: number) => (
                    <tr key={item.id || i}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{item.productNameSnapshot}</td>
                      <td>{item.quantity}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                        {item.unitNameSnapshot || '—'}
                      </td>
                      <td className="currency">{formatCurrency(item.unitPrice)}</td>
                      <td>{item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}</td>
                      <td className="currency" style={{ fontWeight: 600 }}>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>{t('customers.paymentHistory')}</h3>
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
                  {invoice.payments.map((p: any) => {
                    const method = p.paymentMethod || p.payment_method
                    const date = p.createdAt || p.created_at
                    return (
                      <tr key={p.id}>
                        <td className="currency currency-positive">{formatCurrency(p.amount)}</td>
                        <td><span className="badge badge-info">{method === 'cash' ? t('invoices.cash') : method === 'transfer' ? t('invoices.transfer') : t('invoices.other')}</span></td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{p.notes || '—'}</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(date)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════════════════ EDIT MODE ════════════════════════════════════════ */}
      {editMode && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Customer + SaleType */}
            <div className="card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 190px', gap: 'var(--space-4)' }}>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">{t('invoices.customer')}</label>
                  <input className="form-input"
                    value={editCustomerSearch}
                    onChange={(e) => { setEditCustomerSearch(e.target.value); setShowCustomerDd(true); if (!e.target.value) setEditCustomerId('') }}
                    onFocus={() => setShowCustomerDd(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDd(false), 200)}
                    placeholder={t('invoices.selectCustomer')}
                  />
                  {showCustomerDd && customers.length > 0 && (
                    <div style={ddStyle}>
                      {customers.map((c) => (
                        <div key={c.id} className="clickable-row"
                          style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}
                          onMouseDown={() => { setEditCustomerId(c.id); setEditCustomerSearch(c.name); setShowCustomerDd(false) }}
                        >
                          <span style={{ fontWeight: 500 }}>{c.name}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{c.phone || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">{t('invoices.saleType')}</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className={`btn ${editSaleType === 'retail' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setEditSaleType('retail')}>{t('invoices.retail')}</button>
                    <button className={`btn ${editSaleType === 'wholesale' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setEditSaleType('wholesale')}>{t('invoices.wholesale')}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Product search */}
            <div className="card">
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">{t('invoices.addItem')}</label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                  <input className="form-input" style={{ paddingLeft: 36 }}
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setShowProductDd(true) }}
                    onFocus={() => productSearch && setShowProductDd(true)}
                    onBlur={() => setTimeout(() => setShowProductDd(false), 200)}
                    placeholder="Tìm sản phẩm hoặc nhập tên để tạo mới..."
                  />
                </div>
                {showProductDd && productSearch.trim() && (
                  <div style={ddStyle}>
                    {products.map((p) => (
                      <div key={p.id} className="clickable-row"
                        style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseDown={() => addProductToEdit(p)}
                      >
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{p.name}</div>
                          {p.category && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{p.category}</div>}
                        </div>
                        <span className="currency" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)' }}>
                          {formatCurrency(editSaleType === 'retail' ? (p.retail_price ?? p.retailPrice ?? 0) : (p.wholesale_price ?? p.wholesalePrice ?? 0))}
                        </span>
                      </div>
                    ))}
                    <div className="clickable-row"
                      style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, borderTop: products.length > 0 ? '1px solid var(--color-border)' : 'none', color: 'var(--color-accent)', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}
                      onMouseDown={openQuickAddProduct}
                    >
                      <PackagePlus size={15} /> Tạo mới: "<strong>{productSearch}</strong>"
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items table — EDIT */}
            <div className="table-container">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>{t('invoices.product')}</th>
                      <th style={{ width: 90 }}>{t('invoices.quantity')}</th>
                      <th style={{ width: 110 }}>ĐVT</th>
                      <th style={{ width: 130 }}>{t('invoices.unitPrice')}</th>
                      <th style={{ width: 80 }}>{t('invoices.discountPercent')}</th>
                      <th style={{ width: 120 }}>{t('invoices.lineTotal')}</th>
                      <th style={{ width: 44 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((item, index) => (
                      <tr key={index}>
                        <td style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ fontWeight: 500 }}>{item.productNameSnapshot}</td>
                        <td>
                          <input className="form-input" type="number" min="0.01" step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateEditItem(index, 'quantity', Number(e.target.value))}
                            style={{ padding: '4px 8px', textAlign: 'center' }}
                          />
                        </td>
                        {/* ĐVT — dropdown + custom */}
                        <td>
                          {['bao', 'kg', 'bình', 'tấn', 'lít', 'tờ', 'cái'].includes(item.unitNameSnapshot)
                            || item.unitNameSnapshot === ''
                            || item.unitNameSnapshot === undefined ? (
                            <select
                              className="form-input"
                              style={{ padding: '4px 6px' }}
                              value={item.unitNameSnapshot || ''}
                              onChange={(e) => {
                                if (e.target.value === '__other__') {
                                  setEditItems(editItems.map((it, i) => i === index ? { ...it, unitNameSnapshot: '__custom__' } : it))
                                } else {
                                  setEditItems(editItems.map((it, i) => i === index ? { ...it, unitNameSnapshot: e.target.value } : it))
                                }
                              }}
                            >
                              <option value="">—</option>
                              <option value="bao">Bao</option>
                              <option value="kg">Kg</option>
                              <option value="bình">Bình</option>
                              <option value="tấn">Tấn</option>
                              <option value="lít">Lít</option>
                              <option value="tờ">Tờ</option>
                              <option value="cái">Cái</option>
                              <option value="__other__">Khác...</option>
                            </select>
                          ) : (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <input
                                className="form-input"
                                style={{ padding: '4px 8px', flex: 1 }}
                                value={item.unitNameSnapshot === '__custom__' ? '' : item.unitNameSnapshot}
                                placeholder="Nhập đơn vị..."
                                autoFocus
                                onChange={(e) => setEditItems(editItems.map((it, i) => i === index ? { ...it, unitNameSnapshot: e.target.value } : it))}
                              />
                              <button
                                style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}
                                onClick={() => setEditItems(editItems.map((it, i) => i === index ? { ...it, unitNameSnapshot: '' } : it))}
                              >←</button>
                            </div>
                          )}
                        </td>
                        <td>
                          <input className="form-input" type="number" min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateEditItem(index, 'unitPrice', Number(e.target.value))}
                            style={{ padding: '4px 8px', textAlign: 'right' }}
                          />
                        </td>
                        <td>
                          <input className="form-input" type="number" min="0" max="100"
                            value={item.discountPercent}
                            onChange={(e) => updateEditItem(index, 'discountPercent', Number(e.target.value))}
                            style={{ padding: '4px 8px', textAlign: 'center' }}
                          />
                        </td>
                        <td className="currency" style={{ fontWeight: 600 }}>{formatCurrency(item.lineTotal)}</td>
                        <td>
                          <button className="action-btn danger" onClick={() => removeEditItem(index)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {editItems.length === 0 && (
                      <tr>
                        <td colSpan={8}>
                          <div className="table-empty">
                            <ShoppingCart className="table-empty-icon" size={36} />
                            <p>{t('invoices.noItems')}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right col — summary */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
                {invoice.invoiceNumber}
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{t('invoices.subtotal')}</span>
                <span className="currency">{formatCurrency(editSubtotal)}</span>
              </div>
              <div className="form-group">
                <label className="form-label">{t('invoices.totalDiscount')}</label>
                <input className="form-input" type="number" min="0" value={editDiscount || ''} onChange={(e) => setEditDiscount(Number(e.target.value))} placeholder="0" />
              </div>
              <div className="flex-between" style={{ padding: '10px 12px', background: 'var(--color-accent-light)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{t('invoices.totalAmount')}</span>
                <span className="currency" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-accent)', fontWeight: 700 }}>{formatCurrency(editTotal)}</span>
              </div>
              <div className="form-group">
                <label className="form-label">{t('invoices.paidAmount')}</label>
                <input className="form-input" type="number" min="0" value={editPaid || ''} onChange={(e) => setEditPaid(Number(e.target.value))} placeholder="0" />
              </div>
              {editDebt > 0 && (
                <div className="flex-between" style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.07)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{t('invoices.debtAmount')}</span>
                  <span className="currency currency-negative">{formatCurrency(editDebt)}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">{t('common.notes')}</label>
                <textarea className="form-input" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleSaveEdit} disabled={saving || editItems.length === 0 || !isDirty} style={{ width: '100%' }}>
                {saving ? <div className="loading-spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> : <Save size={15} />}
                {isDirty ? 'Lưu thay đổi' : 'Chưa có thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit History ─────────────────────────────────────────────────── */}
      {editHistory.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <button onClick={() => setShowHistory(!showHistory)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showHistory ? 'var(--space-4)' : 0 }}>
            <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} />
              Lịch sử chỉnh sửa
              <span style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)', borderRadius: '999px', padding: '1px 8px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                {editHistory.length}
              </span>
            </h3>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {editHistory.map((h: any, idx: number) => {
                let snap: any = null
                try { snap = h.snapshotJson ? JSON.parse(h.snapshotJson) : null } catch {}
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: idx < editHistory.length - 1 ? '1px solid var(--color-border)' : 'none', alignItems: 'flex-start' }}>
                    {/* timeline dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, paddingTop: 4, flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-accent)', border: '2px solid var(--color-accent-light)' }} />
                      {idx < editHistory.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--color-border)', marginTop: 4, minHeight: 20 }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Summary tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                        {h.changeSummary.split('; ').map((tag: string, ti: number) => (
                          <span key={ti} style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                            background: tag.startsWith('Thêm') ? 'rgba(22,163,74,0.1)' : tag.startsWith('Xóa') ? 'rgba(239,68,68,0.1)' : 'var(--color-accent-light)',
                            color: tag.startsWith('Thêm') ? '#15803d' : tag.startsWith('Xóa') ? '#dc2626' : 'var(--color-accent)',
                            fontWeight: 500, whiteSpace: 'nowrap'
                          }}>{tag}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={11} /> {formatTS(h.changedAt)}
                        {snap && snap.items && (
                          <button
                            onClick={() => setHistoryDetailItem(h)}
                            style={{ marginLeft: 4, background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '1px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}
                          >
                            <Eye size={11} /> Xem chi tiết
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── History Detail Modal ─────────────────────────────────────── */}
      {historyDetailItem && (() => {
        let snap: any = null
        try { snap = historyDetailItem.snapshotJson ? JSON.parse(historyDetailItem.snapshotJson) : {} } catch { snap = {} }
        return (
          <Modal isOpen={!!historyDetailItem} onClose={() => setHistoryDetailItem(null)}
            title="Chi tiết chỉnh sửa" size="lg"
            footer={<button className="btn btn-secondary" onClick={() => setHistoryDetailItem(null)}>Đóng</button>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <Clock size={14} /> {formatTS(historyDetailItem.changedAt)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 8, color: 'var(--color-text-secondary)' }}>Thay đổi</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {historyDetailItem.changeSummary.split('; ').map((tag: string, ti: number) => (
                    <span key={ti} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px',
                      background: tag.startsWith('Thêm') ? 'rgba(22,163,74,0.1)' : tag.startsWith('Xóa') ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.08)',
                      color: tag.startsWith('Thêm') ? '#15803d' : tag.startsWith('Xóa') ? '#dc2626' : 'var(--color-accent)',
                      fontWeight: 500 }}>{tag}</span>
                  ))}
                </div>
              </div>
              {snap.subtotal !== undefined && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 8, color: 'var(--color-text-secondary)' }}>Trạng thái trước khi sửa</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', background: 'var(--color-bg-secondary,#f8fafc)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                    <div><div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Tạm tính</div><div style={{ fontWeight: 600 }}>{formatCurrency(snap.subtotal || 0)}</div></div>
                    <div><div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Tổng cộng</div><div style={{ fontWeight: 600 }}>{formatCurrency(snap.totalAmount || 0)}</div></div>
                    <div><div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Đã thanh toán</div><div style={{ fontWeight: 600 }}>{formatCurrency(snap.paidAmount || 0)}</div></div>
                  </div>
                </div>
              )}
              {snap.items && snap.items.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 8, color: 'var(--color-text-secondary)' }}>Danh sách sản phẩm trước khi sửa</div>
                  <table className="data-table" style={{ fontSize: 'var(--font-size-sm)' }}>
                    <thead><tr><th>#</th><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>CK%</th><th>Thành tiền</th></tr></thead>
                    <tbody>
                      {snap.items.map((it: any, si: number) => (
                        <tr key={si}>
                          <td style={{ color: 'var(--color-text-muted)' }}>{si + 1}</td>
                          <td style={{ fontWeight: 500 }}>{it.name}</td>
                          <td>{it.quantity}</td>
                          <td className="currency">{formatCurrency(it.unitPrice)}</td>
                          <td>{it.discountPercent > 0 ? `${it.discountPercent}%` : '—'}</td>
                          <td className="currency" style={{ fontWeight: 600 }}>{formatCurrency(it.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Modal>
        )
      })()}

      {/* ── Invoice Preview Modal ────────────────────────────────────── */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title={`Xem trước: ${invoice.invoiceNumber}`} size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Đóng</button>
          <button className="btn btn-primary" onClick={() => { setShowPreview(false); handleExportPDF() }}>
            <Download size={15} /> Xuất PDF
          </button>
        </>}
      >
        <div style={{ fontFamily: '"Segoe UI", sans-serif', fontSize: 13, color: '#1a1a1a', background: '#fff', padding: '24px 28px', border: '1px solid #e5e7eb', borderRadius: 8, maxHeight: '68vh', overflowY: 'auto' }}>
          {/* Store header */}
          <div style={{ borderBottom: '2.5px solid #2d6a4f', paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#2d6a4f', letterSpacing: 0.5 }}>
                  {(storeSettings.store_name || 'Cua Hang Thi').toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: '#6c757d', fontStyle: 'italic', marginTop: 1 }}>
                  Vat Tu Nong Nghiep - Vat Lieu Xay Dung
                </div>
                <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>
                  Dia chi: {storeSettings.store_address || 'An Binh, Vinh Long'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {(storeSettings.store_phone ? storeSettings.store_phone.split(/[-,]/).map((p: string) => p.trim()) : ['0939 587 899', '0795 921 716']).map((phone: string, pi: number) => (
                  <div key={pi} style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>DT: {phone}</div>
                ))}
              </div>
            </div>
            {/* Specialties bar */}
            <div style={{ background: '#d8f3dc', borderRadius: 4, padding: '3px 8px', marginTop: 6, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: '#2d6a4f', fontStyle: 'italic' }}>
                Chuyen: Phan bon · Thuc an · Gao · Gas · Cat · Da · Xi mang · Gach · Trang tri noi that
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>HOA DON BAN HANG</div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#555', marginBottom: 14 }}>So: {invoice.invoiceNumber}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px', marginBottom: 14, fontSize: 12 }}>
            <div><span style={{ color: '#777' }}>Khách hàng: </span><strong>{invoice.customerNameSnapshot || 'Khách lẻ'}</strong></div>
            {invoice.customerPhoneSnapshot && <div><span style={{ color: '#777' }}>Điện thoại: </span><strong>{invoice.customerPhoneSnapshot}</strong></div>}
            <div><span style={{ color: '#777' }}>Ngày: </span><strong>{formatTS(invoice.createdAt)}</strong></div>
            <div><span style={{ color: '#777' }}>Loại bán: </span><strong>{invoice.saleType === 'retail' ? 'Bán lẻ' : 'Bán sỉ'}</strong></div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
            <thead>
              <tr style={{ background: '#f0f0f0', borderTop: '1px solid #555', borderBottom: '1px solid #555' }}>
                <th style={{ padding: '4px 6px', textAlign: 'center', width: 28 }}>STT</th>
                <th style={{ padding: '4px 6px', textAlign: 'left' }}>Sản phẩm</th>
                <th style={{ padding: '4px 6px', textAlign: 'center', width: 40 }}>SL</th>
                <th style={{ padding: '4px 6px', textAlign: 'right', width: 90 }}>Đơn giá</th>
                <th style={{ padding: '4px 6px', textAlign: 'center', width: 38 }}>CK%</th>
                <th style={{ padding: '4px 6px', textAlign: 'right', width: 95 }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#888' }}>{i + 1}</td>
                  <td style={{ padding: '4px 6px', fontWeight: 500 }}>{item.productNameSnapshot}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>{item.discountPercent > 0 ? `${item.discountPercent}%` : ''}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, borderTop: '1px solid #ccc', paddingTop: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: 230, fontSize: 12 }}>
              <span style={{ color: '#555' }}>Tạm tính:</span><span style={{ fontWeight: 600 }}>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: 230, fontSize: 12 }}>
                <span style={{ color: '#555' }}>Giảm giá:</span><span style={{ fontWeight: 600, color: '#d97706' }}>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: 230, borderTop: '2px solid #333', paddingTop: 6, marginTop: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>TỔNG CỘNG:</span><span style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: 230, fontSize: 12 }}>
              <span style={{ color: '#555' }}>Đã thanh toán:</span><span style={{ fontWeight: 600, color: '#16a34a' }}>{formatCurrency(invoice.paidAmount)}</span>
            </div>
            {invoice.debtAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: 230, fontSize: 12 }}>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>Còn nợ:</span><span style={{ fontWeight: 700, color: '#dc2626' }}>{formatCurrency(invoice.debtAmount)}</span>
              </div>
            )}
          </div>
          {invoice.notes && <div style={{ fontSize: 11, color: '#555', marginBottom: 10 }}>Ghi chú: {invoice.notes}</div>}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#888', borderTop: '1px solid #ddd', paddingTop: 10 }}>Cảm ơn quý khách! Hẹn gặp lại.</div>
        </div>
      </Modal>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <Modal isOpen={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title={t('common.confirm')}
        footer={<><button className="btn btn-secondary" onClick={() => setShowCancelConfirm(false)}>{t('common.cancel')}</button><button className="btn btn-danger" onClick={handleCancel}>{t('common.confirm')}</button></>}>
        <p>{t('invoices.confirmCancel')}</p>
      </Modal>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Xác nhận hóa đơn"
        footer={<><button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={handleConfirm}><CheckCircle size={15} /> Xác nhận</button></>}>
        <p>Bạn có chắc muốn xác nhận hóa đơn <strong>{invoice.invoiceNumber}</strong>? Sau khi xác nhận sẽ không thể chỉnh sửa thêm.</p>
      </Modal>

      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title={t('invoices.addPayment')}
        footer={<><button className="btn btn-secondary" onClick={() => setShowPayment(false)}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={handlePayment} disabled={paymentAmount <= 0}>{t('common.save')}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">{t('invoices.paidAmount')}</label>
            <input className="form-input" type="number" min="0" value={paymentAmount || ''} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('invoices.paymentMethod')}</label>
            <select className="form-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
              <option value="cash">{t('invoices.cash')}</option>
              <option value="transfer">{t('invoices.transfer')}</option>
              <option value="other">{t('invoices.other')}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('common.notes')}</label>
            <textarea className="form-input" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} title="Tạo sản phẩm mới & thêm vào hóa đơn" size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowQuickAdd(false)}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={handleQuickSaveProduct} disabled={savingProduct}>{savingProduct ? <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <PackagePlus size={15} />} Tạo & Thêm</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label required">Tên sản phẩm</label>
            <input className="form-input" value={quickForm.name} onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Danh mục</label>
            <input className="form-input" value={quickForm.category} onChange={(e) => setQuickForm({ ...quickForm, category: e.target.value })} />
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Giá bán lẻ</label>
              <input className="form-input" type="number" min="0" value={quickForm.retailPrice || ''} onChange={(e) => setQuickForm({ ...quickForm, retailPrice: Number(e.target.value) })} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Giá bán sỉ</label>
              <input className="form-input" type="number" min="0" value={quickForm.wholesalePrice || ''} onChange={(e) => setQuickForm({ ...quickForm, wholesalePrice: Number(e.target.value) })} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Giá vốn</label>
              <input className="form-input" type="number" min="0" value={quickForm.costPrice || ''} onChange={(e) => setQuickForm({ ...quickForm, costPrice: Number(e.target.value) })} placeholder="0" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
