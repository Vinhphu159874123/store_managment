import { HashRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import ProductList from './pages/products/ProductList'
import ProductDetail from './pages/products/ProductDetail'
import CustomerList from './pages/customers/CustomerList'
import CustomerDetail from './pages/customers/CustomerDetail'
import InvoiceList from './pages/invoices/InvoiceList'
import InvoiceCreate from './pages/invoices/InvoiceCreate'
import InvoiceDetail from './pages/invoices/InvoiceDetail'
import InvoiceEdit from './pages/invoices/InvoiceEdit'
import Settings from './pages/settings/Settings'

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoices/create" element={<InvoiceCreate />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/invoices/:id/edit" element={<InvoiceEdit />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
