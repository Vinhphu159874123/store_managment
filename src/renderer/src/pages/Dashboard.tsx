import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DollarSign, FileText, AlertTriangle, Users } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/formatters'
import Modal from '../components/ui/Modal'

interface DashboardStats {
  todayRevenue: number
  todayCollected: number
  todayProfit: number
  todayNewDebt: number
  todayInvoiceCount: number
  totalDebt: number
  totalCustomers: number
  recentInvoices: any[]
  last7Days: { date: string; revenue: number; profit: number }[]
  topDebtors: { customerId: string; customerName: string; totalDebt: number }[]
}

interface DayDetail {
  revenue: number
  collected: number
  profit: number
  debt: number
  invoiceCount: number
  invoices: any[]
}

export default function Dashboard(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null)
  const [loadingDay, setLoadingDay] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      loadDayDetail(selectedDate)
    }
  }, [selectedDate])

  async function loadDayDetail(dateStr: string) {
    setLoadingDay(true)
    try {
      const data = await window.api.invoices.dayDetail(dateStr)
      setDayDetail(data)
    } catch (error) {
      console.error('Failed to load day detail:', error)
    } finally {
      setLoadingDay(false)
    }
  }

  async function loadStats(): Promise<void> {
    try {
      const data = await window.api.invoices.dashboardStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
        <span>{t('common.loading')}</span>
      </div>
    )
  }

  const maxRevenue = Math.max(...(stats?.last7Days.map((d) => d.revenue) || [1]), 1)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('common.storeName')}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-5" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card animate-fade-in-up stagger-1" style={{ '--stat-color': 'var(--color-accent)' } as any}>
          <div className="stat-card-icon" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            <DollarSign size={20} />
          </div>
          <div className="stat-card-value currency">{formatCurrency(stats?.todayRevenue || 0)}</div>
          <div className="stat-card-label">Doanh thu hôm nay</div>
        </div>

        <div className="stat-card animate-fade-in-up stagger-1" style={{ '--stat-color': 'var(--color-primary)' } as any}>
          <div className="stat-card-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <DollarSign size={20} />
          </div>
          <div className="stat-card-value currency">{formatCurrency(stats?.todayCollected || 0)}</div>
          <div className="stat-card-label">Tiền đã thu hôm nay</div>
        </div>

        <div className="stat-card animate-fade-in-up stagger-2" style={{ '--stat-color': 'var(--color-success)' } as any}>
          <div className="stat-card-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <DollarSign size={20} />
          </div>
          <div className="stat-card-value currency">{formatCurrency(stats?.todayProfit || 0)}</div>
          <div className="stat-card-label">Lợi nhuận hôm nay</div>
        </div>

        <div className="stat-card animate-fade-in-up stagger-3" style={{ '--stat-color': 'var(--color-warning)' } as any}>
          <div className="stat-card-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-card-value currency">{formatCurrency(stats?.todayNewDebt || 0)}</div>
          <div className="stat-card-label">Công nợ mới hôm nay</div>
        </div>

        <div className="stat-card animate-fade-in-up stagger-4" style={{ '--stat-color': 'var(--color-danger)' } as any}>
          <div className="stat-card-icon" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-card-value currency currency-negative">{formatCurrency(stats?.totalDebt || 0)}</div>
          <div className="stat-card-label">Tổng nợ</div>
        </div>
      </div>

      {/* Stat Cards Row 2 (Other) */}
      <div className="grid grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card animate-fade-in-up stagger-4" style={{ '--stat-color': 'var(--color-primary)' } as any}>
          <div className="stat-card-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <FileText size={20} />
          </div>
          <div className="stat-card-value">{stats?.todayInvoiceCount || 0}</div>
          <div className="stat-card-label">Hóa đơn hôm nay</div>
        </div>

        <div className="stat-card animate-fade-in-up stagger-5" style={{ '--stat-color': 'var(--color-info)' } as any}>
          <div className="stat-card-icon" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
            <Users size={20} />
          </div>
          <div className="stat-card-value">{stats?.totalCustomers || 0}</div>
          <div className="stat-card-label">Tổng khách hàng</div>
        </div>
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-2">
        {/* Revenue Chart */}
        <div className="card animate-fade-in-up stagger-3">
          <div className="card-header">
            <h3 className="card-title">{t('dashboard.revenueChart')}</h3>
          </div>
          <div className="bar-chart">
            {stats?.last7Days.map((day, i) => {
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
              const dateLabel = new Date(day.date).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit'
              })
              return (
                <div 
                  key={i} 
                  className="bar-chart-item" 
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => setSelectedDate(day.date)}
                  title="Nhấn để xem chi tiết"
                >
                  <div className="bar-chart-value">
                    {day.revenue > 0 ? formatCurrency(day.revenue) : ''}
                  </div>
                  <div
                    className="bar-chart-bar"
                    style={{ height: `${Math.max(height, 3)}%` }}
                  />
                  <div className="bar-chart-label">{dateLabel}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-success)', marginTop: '2px', fontWeight: 500, textAlign: 'center' }}>
                    {day.profit > 0 ? `Lãi: ${formatCurrency(day.profit)}` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Debtors */}
        <div className="card animate-fade-in-up stagger-4">
          <div className="card-header">
            <h3 className="card-title">{t('dashboard.topDebtors')}</h3>
          </div>
          {stats?.topDebtors && stats.topDebtors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {stats.topDebtors.map((debtor, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3)',
                    background: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                  onClick={() => debtor.customerId && navigate(`/customers/${debtor.customerId}`)}
                >
                  <span>{debtor.customerName || t('customers.walkIn')}</span>
                  <span className="currency currency-negative">{formatCurrency(debtor.totalDebt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-empty">
              <p>{t('common.noData')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card animate-fade-in-up stagger-5" style={{ marginTop: 'var(--space-6)' }}>
        <div className="card-header">
          <h3 className="card-title">{t('dashboard.recentInvoices')}</h3>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('invoices.invoiceNumber')}</th>
                <th>{t('invoices.customer')}</th>
                <th>{t('invoices.saleType')}</th>
                <th>{t('invoices.totalAmount')}</th>
                <th>{t('invoices.debtAmount')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.date')}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="clickable-row"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{inv.invoiceNumber}</td>
                  <td>{inv.customerNameSnapshot || t('customers.walkIn')}</td>
                  <td>
                    <span className={`badge ${inv.saleType === 'retail' ? 'badge-info' : 'badge-primary'}`}>
                      {inv.saleType === 'retail' ? t('invoices.retail') : t('invoices.wholesale')}
                    </span>
                  </td>
                  <td className="currency">{formatCurrency(inv.totalAmount)}</td>
                  <td className={`currency ${inv.debtAmount > 0 ? 'currency-negative' : ''}`}>
                    {inv.debtAmount > 0 ? formatCurrency(inv.debtAmount) : '-'}
                  </td>
                  <td>
                    <span className={`badge ${inv.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                      {inv.status === 'completed' ? t('invoices.completed') : t('invoices.cancelled')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(inv.createdAt)}</td>
                </tr>
              ))}
              {(!stats?.recentInvoices || stats.recentInvoices.length === 0) && (
                <tr>
                  <td colSpan={7} className="table-empty">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Day Detail Modal */}
      <Modal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title="Chi tiết Báo cáo Ngày"
        size="lg"
      >
        <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <label style={{ fontWeight: 'var(--font-weight-medium)' }}>Chọn ngày:</label>
          <input 
            type="date" 
            className="input" 
            value={selectedDate || ''} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            style={{ width: 'auto' }}
          />
        </div>
        
        {loadingDay ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>Đang tải...</div>
        ) : (
          <>
            <div className="grid grid-5" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="stat-card" style={{ '--stat-color': 'var(--color-accent)' } as any}>
                <div className="stat-card-value currency">{formatCurrency(dayDetail?.revenue || 0)}</div>
                <div className="stat-card-label">Doanh thu</div>
              </div>
              <div className="stat-card" style={{ '--stat-color': 'var(--color-primary)' } as any}>
                <div className="stat-card-value currency">{formatCurrency(dayDetail?.collected || 0)}</div>
                <div className="stat-card-label">Tiền đã thu</div>
              </div>
              <div className="stat-card" style={{ '--stat-color': 'var(--color-success)' } as any}>
                <div className="stat-card-value currency">{formatCurrency(dayDetail?.profit || 0)}</div>
                <div className="stat-card-label">Lợi nhuận</div>
              </div>
              <div className="stat-card" style={{ '--stat-color': 'var(--color-danger)' } as any}>
                <div className="stat-card-value currency currency-negative">{formatCurrency(dayDetail?.debt || 0)}</div>
                <div className="stat-card-label">Nợ mới</div>
              </div>
              <div className="stat-card" style={{ '--stat-color': 'var(--color-primary)' } as any}>
                <div className="stat-card-value">{dayDetail?.invoiceCount || 0}</div>
                <div className="stat-card-label">Số Hóa đơn</div>
              </div>
            </div>

            <div className="table-scroll" style={{ maxHeight: '400px' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg-primary)', zIndex: 1 }}>
                  <tr>
                    <th>Mã HĐ</th>
                    <th>Khách hàng</th>
                    <th>Tổng tiền</th>
                    <th>Lợi nhuận</th>
                    <th>Nợ</th>
                    <th>Giờ tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {dayDetail?.invoices.map(inv => (
                    <tr key={inv.id} className="clickable-row" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{inv.invoiceNumber}</td>
                      <td>{inv.customerNameSnapshot || t('customers.walkIn')}</td>
                      <td className="currency">{formatCurrency(inv.totalAmount)}</td>
                      <td className="currency" style={{ color: 'var(--color-success)' }}>{formatCurrency(inv.profit)}</td>
                      <td className={`currency ${inv.debtAmount > 0 ? 'currency-negative' : ''}`}>
                        {inv.debtAmount > 0 ? formatCurrency(inv.debtAmount) : '-'}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(inv.createdAt).toLocaleTimeString('vi-VN')}</td>
                    </tr>
                  ))}
                  {(!dayDetail?.invoices || dayDetail.invoices.length === 0) && (
                    <tr><td colSpan={6} className="table-empty">Không có hóa đơn nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
