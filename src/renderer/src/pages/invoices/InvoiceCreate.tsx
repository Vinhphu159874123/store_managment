import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Search, ShoppingCart, PackagePlus } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { useToastStore } from '../../stores/toastStore'
import Modal from '../../components/ui/Modal'

interface InvoiceLineItem {
  productId: string
  productNameSnapshot: string
  unitNameSnapshot: string
  quantity: number
  unitPrice: number
  discountPercent: number
  discountAmount: number
  lineTotal: number
}

// Quick-create product form state
interface QuickProductForm {
  name: string
  category: string
  retailPrice: number
  wholesalePrice: number
  costPrice: number
}

export default function InvoiceCreate(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const addToast = useToastStore((s) => s.addToast)

  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [saleType, setSaleType] = useState<'retail' | 'wholesale'>('retail')
  const [items, setItems] = useState<InvoiceLineItem[]>([])
  const [invoiceDiscount, setInvoiceDiscount] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [saving, setSaving] = useState(false)

  // Quick-add product modal
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickForm, setQuickForm] = useState<QuickProductForm>({
    name: '',
    category: '',
    retailPrice: 0,
    wholesalePrice: 0,
    costPrice: 0
  })
  const [savingProduct, setSavingProduct] = useState(false)

  useEffect(() => {
    loadInvoiceNumber()
  }, [])

  useEffect(() => {
    const customerIdParam = searchParams.get('customer')
    if (customerIdParam) {
      window.api.customers.get(customerIdParam)
        .then(c => {
          if (c) {
            setSelectedCustomerId(c.id)
            setCustomerSearch(c.name)
          }
        })
        .catch(err => console.error('Failed to load initial customer:', err))
    }
  }, [searchParams])

  async function loadInvoiceNumber(): Promise<void> {
    const num = await window.api.invoices.nextNumber()
    setInvoiceNumber(num)
  }

  // Search customers
  useEffect(() => {
    const timer = setTimeout(async () => {
      const data = await window.api.customers.list(customerSearch || undefined)
      setCustomers(Array.isArray(data) ? data : [])
    }, 200)
    return () => clearTimeout(timer)
  }, [customerSearch])

  // Search products
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (productSearch.trim()) {
        const data = await window.api.products.list(productSearch)
        setProducts(Array.isArray(data) ? data : [])
      } else {
        setProducts([])
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [productSearch])

  function selectCustomer(customer: any): void {
    setSelectedCustomerId(customer.id)
    setCustomerSearch(customer.name)
    setShowCustomerDropdown(false)
  }

  function addProductToInvoice(product: any): void {
    if (items.find((item) => item.productId === product.id)) {
      setItems(
        items.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                lineTotal: (item.quantity + 1) * item.unitPrice * (1 - item.discountPercent / 100)
              }
            : item
        )
      )
    } else {
      const price = saleType === 'retail'
        ? (product.retail_price ?? product.retailPrice ?? 0)
        : (product.wholesale_price ?? product.wholesalePrice ?? 0)
      setItems([
        ...items,
        {
          productId: product.id,
          productNameSnapshot: product.name,
          unitNameSnapshot: '',
          quantity: 1,
          unitPrice: price,
          discountPercent: 0,
          discountAmount: 0,
          lineTotal: price
        }
      ])
    }
    setProductSearch('')
    setShowProductDropdown(false)
  }

  function updateItem(index: number, field: string, value: number): void {
    setItems(
      items.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, [field]: value }
        const discAmt = (updated.unitPrice * updated.quantity * updated.discountPercent) / 100
        updated.discountAmount = discAmt
        updated.lineTotal = updated.unitPrice * updated.quantity - discAmt
        return updated
      })
    )
  }

  function removeItem(index: number): void {
    setItems(items.filter((_, i) => i !== index))
  }

  function handleSaleTypeChange(type: 'retail' | 'wholesale'): void {
    setSaleType(type)
  }

  // Open quick-add with current search text pre-filled
  function openQuickAdd(): void {
    setQuickForm({
      name: productSearch,
      category: '',
      retailPrice: 0,
      wholesalePrice: 0,
      costPrice: 0
    })
    setShowProductDropdown(false)
    setShowQuickAdd(true)
  }

  // Save new product then immediately add to invoice
  async function handleQuickSaveProduct(): Promise<void> {
    if (!quickForm.name.trim()) {
      addToast('error', 'Vui lòng nhập tên sản phẩm')
      return
    }
    setSavingProduct(true)
    try {
      const autoCode = `SP${Date.now().toString().slice(-6)}`
      const result = await window.api.products.create({
        code: autoCode,
        name: quickForm.name,
        category: quickForm.category,
        description: '',
        retailPrice: quickForm.retailPrice,
        wholesalePrice: quickForm.wholesalePrice,
        costPrice: quickForm.costPrice
      })

      // Add the newly created product to invoice immediately
      const price = saleType === 'retail' ? quickForm.retailPrice : quickForm.wholesalePrice
      setItems([
        ...items,
        {
          productId: result.id,
          productNameSnapshot: quickForm.name,
          unitNameSnapshot: '',
          quantity: 1,
          unitPrice: price,
          discountPercent: 0,
          discountAmount: 0,
          lineTotal: price
        }
      ])

      addToast('success', `Đã tạo và thêm "${quickForm.name}" vào hóa đơn`)
      setShowQuickAdd(false)
      setProductSearch('')
    } catch (error: any) {
      addToast('error', error.message || 'Lỗi khi tạo sản phẩm')
    } finally {
      setSavingProduct(false)
    }
  }

  // Totals
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const totalAmount = subtotal - invoiceDiscount
  const debtAmount = Math.max(0, totalAmount - paidAmount)

  async function handleSave(status: 'completed' | 'draft' = 'completed'): Promise<void> {
    if (items.length === 0) {
      addToast('error', t('invoices.noItems'))
      return
    }
    setSaving(true)
    try {
      const result = await window.api.invoices.create({
        customerId: selectedCustomerId || undefined,
        saleType,
        discountAmount: invoiceDiscount,
        paidAmount,
        notes,
        items,
        status
      })
      if (status === 'draft') {
        addToast('success', `Đã lưu nháp: ${result.invoiceNumber}`)
      } else {
        addToast('success', `${t('invoices.createSuccess')}: ${result.invoiceNumber}`)
      }
      navigate(`/invoices/${result.id}`)
    } catch (error: any) {
      addToast('error', error.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    maxHeight: '260px',
    overflowY: 'auto',
    zIndex: 200,
    boxShadow: 'var(--shadow-lg)'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('invoices.createInvoice')}</h1>
          <p className="page-subtitle">{invoiceNumber}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 'var(--space-5)' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Customer & Sale Type */}
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">{t('invoices.customer')}</label>
                <input
                  className="form-input"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                    if (!e.target.value) setSelectedCustomerId('')
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  placeholder={t('invoices.selectCustomer')}
                />
                {showCustomerDropdown && customers.length > 0 && (
                  <div style={dropdownStyle}>
                    {customers.map((c) => (
                      <div
                        key={c.id}
                        className="clickable-row"
                        style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}
                        onMouseDown={() => selectCustomer(c)}
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
                  <button
                    className={`btn ${saleType === 'retail' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleSaleTypeChange('retail')}
                  >
                    {t('invoices.retail')}
                  </button>
                  <button
                    className={`btn ${saleType === 'wholesale' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleSaleTypeChange('wholesale')}
                  >
                    {t('invoices.wholesale')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Search */}
          <div className="card">
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">{t('invoices.addItem')}</label>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setShowProductDropdown(true)
                  }}
                  onFocus={() => productSearch && setShowProductDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                  placeholder="Tìm sản phẩm hoặc nhập tên để tạo mới..."
                />
              </div>

              {/* Product dropdown */}
              {showProductDropdown && productSearch.trim() && (
                <div style={dropdownStyle}>
                  {/* Existing products */}
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="clickable-row"
                      style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseDown={() => addProductToInvoice(p)}
                    >
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{p.name}</div>
                        {p.category && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{p.category}</div>
                        )}
                      </div>
                      <span className="currency" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)' }}>
                        {formatCurrency(saleType === 'retail'
                          ? (p.retail_price ?? p.retailPrice ?? 0)
                          : (p.wholesale_price ?? p.wholesalePrice ?? 0)
                        )}
                      </span>
                    </div>
                  ))}

                  {/* Divider + Quick-add button */}
                  <div
                    className="clickable-row"
                    style={{
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderTop: products.length > 0 ? '1px solid var(--color-border)' : 'none',
                      color: 'var(--color-accent)',
                      fontWeight: 500,
                      fontSize: 'var(--font-size-sm)'
                    }}
                    onMouseDown={openQuickAdd}
                  >
                    <PackagePlus size={16} />
                    Tạo sản phẩm mới: "<strong>{productSearch}</strong>"
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="table-container">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>{t('invoices.product')}</th>
                    <th style={{ width: 90 }}>{t('invoices.quantity')}</th>
                    <th style={{ width: 130 }}>{t('invoices.unitPrice')}</th>
                    <th style={{ width: 80 }}>{t('invoices.discountPercent')}</th>
                    <th style={{ width: 130 }}>{t('invoices.lineTotal')}</th>
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ fontWeight: 500 }}>{item.productNameSnapshot}</td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          style={{ padding: '4px 8px', textAlign: 'center' }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                          style={{ padding: '4px 8px', textAlign: 'right' }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => updateItem(index, 'discountPercent', Number(e.target.value))}
                          style={{ padding: '4px 8px', textAlign: 'center' }}
                        />
                      </td>
                      <td className="currency" style={{ fontWeight: 600 }}>{formatCurrency(item.lineTotal)}</td>
                      <td>
                        <button className="action-btn danger" onClick={() => removeItem(index)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7}>
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

        {/* Right: Summary */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
              {invoiceNumber}
            </div>

            <div className="flex-between">
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{t('invoices.subtotal')}</span>
              <span className="currency">{formatCurrency(subtotal)}</span>
            </div>

            <div className="form-group">
              <label className="form-label">{t('invoices.totalDiscount')}</label>
              <input className="form-input" type="number" min="0" value={invoiceDiscount || ''} onChange={(e) => setInvoiceDiscount(Number(e.target.value))} placeholder="0" />
            </div>

            <div className="flex-between" style={{ padding: '10px 12px', background: 'var(--color-accent-light)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{t('invoices.totalAmount')}</span>
              <span className="currency" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-accent)', fontWeight: 700 }}>{formatCurrency(totalAmount)}</span>
            </div>

            <div className="form-group">
              <label className="form-label">{t('invoices.paidAmount')}</label>
              <input className="form-input" type="number" min="0" value={paidAmount || ''} onChange={(e) => setPaidAmount(Number(e.target.value))} placeholder="0" />
            </div>

            {debtAmount > 0 && (
              <div className="flex-between" style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.07)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{t('invoices.debtAmount')}</span>
                <span className="currency currency-negative">{formatCurrency(debtAmount)}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('common.notes')}</label>
              <textarea className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => handleSave('completed')}
                disabled={saving || items.length === 0}
                style={{ width: '100%' }}
              >
                {saving ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Plus size={16} />}
                {t('invoices.createInvoice')}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleSave('draft')}
                disabled={saving || items.length === 0}
                style={{ width: '100%' }}
              >
                📝 Lưu nháp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Quick-Add Product Modal ============ */}
      <Modal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        title="Tạo sản phẩm mới & thêm vào hóa đơn"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowQuickAdd(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" onClick={handleQuickSaveProduct} disabled={savingProduct}>
              {savingProduct
                ? <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                : <PackagePlus size={15} />
              }
              Tạo & Thêm vào hóa đơn
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Info banner */}
          <div style={{ background: 'var(--color-accent-light)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackagePlus size={15} />
            Sản phẩm sẽ được lưu vào danh mục sản phẩm và thêm ngay vào hóa đơn này.
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label required">Tên sản phẩm</label>
              <input
                className="form-input"
                value={quickForm.name}
                onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                placeholder="VD: Xi măng Hà Tiên 50kg"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Danh mục</label>
            <input
              className="form-input"
              value={quickForm.category}
              onChange={(e) => setQuickForm({ ...quickForm, category: e.target.value })}
              placeholder="VD: Vật liệu xây dựng"
            />
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label required">Giá bán lẻ</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={quickForm.retailPrice || ''}
                onChange={(e) => setQuickForm({ ...quickForm, retailPrice: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Giá bán sỉ</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={quickForm.wholesalePrice || ''}
                onChange={(e) => setQuickForm({ ...quickForm, wholesalePrice: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Giá vốn</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={quickForm.costPrice || ''}
                onChange={(e) => setQuickForm({ ...quickForm, costPrice: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>

          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', padding: '4px 0' }}>
            💡 Giá áp dụng cho hóa đơn này: <strong style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(saleType === 'retail' ? quickForm.retailPrice : quickForm.wholesalePrice)}</strong> ({saleType === 'retail' ? 'Bán lẻ' : 'Bán sỉ'})
          </div>
        </div>
      </Modal>
    </div>
  )
}
