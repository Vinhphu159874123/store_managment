import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  FilePlus,
  Settings
} from 'lucide-react'

export default function Sidebar(): JSX.Element {
  const { t } = useTranslation()
  const location = useLocation()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/products', icon: Package, label: t('nav.products') },
    { to: '/customers', icon: Users, label: t('nav.customers') },
    { to: '/invoices', icon: FileText, label: t('nav.invoices') },
    { to: '/invoices/create', icon: FilePlus, label: t('nav.createInvoice') },
    { to: '/settings', icon: Settings, label: t('nav.settings') }
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">T</div>
        <span className="sidebar-title">{t('common.storeName')}</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={20} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          v1.0.0
        </div>
      </div>
    </aside>
  )
}
