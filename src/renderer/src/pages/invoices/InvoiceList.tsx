import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, Plus } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'

export default function InvoiceList(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadInvoices = useCallback(async () => {
    try {
      const data = await window.api.invoices.list(search ? { search } : undefined)
      setInvoices(data)
    } catch (error) {
      console.error('Failed to load invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => loadInvoices(), 300)
    return () => clearTimeout(timer)
  }, [loadInvoices])

  if (loading) return <div className="loading-page"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('invoices.title')}</h1>
          <p className="page-subtitle">{invoices.length} {t('nav.invoices').toLowerCase()}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/invoices/create')}>
            <Plus size={18} />
            {t('invoices.createInvoice')}
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder={t('invoices.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('invoices.invoiceNumber')}</th>
                <th>{t('invoices.customer')}</th>
                <th>{t('invoices.saleType')}</th>
                <th>{t('invoices.totalAmount')}</th>
                <th>{t('invoices.paidAmount')}</th>
                <th>{t('invoices.debtAmount')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.date')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="clickable-row"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <td style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-accent)' }}>
                    {inv.invoiceNumber}
                  </td>
                  <td>{inv.customerNameSnapshot || t('customers.walkIn')}</td>
                  <td>
                    <span className={`badge ${inv.saleType === 'retail' ? 'badge-info' : 'badge-primary'}`}>
                      {inv.saleType === 'retail' ? t('invoices.retail') : t('invoices.wholesale')}
                    </span>
                  </td>
                  <td className="currency">{formatCurrency(inv.totalAmount)}</td>
                  <td className="currency currency-positive">
                    {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount) : '—'}
                  </td>
                  <td className={`currency ${inv.debtAmount > 0 ? 'currency-negative' : ''}`}>
                    {inv.debtAmount > 0 ? formatCurrency(inv.debtAmount) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${inv.status === 'completed' ? 'badge-success' : inv.status === 'draft' ? 'badge-warning' : 'badge-danger'}`}>
                      {inv.status === 'completed' ? t('invoices.completed') : inv.status === 'draft' ? 'Nháp' : t('invoices.cancelled')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(inv.createdAt)}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">
                      <FileText className="table-empty-icon" size={48} />
                      <p>{t('common.noData')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
