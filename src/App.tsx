import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Customers from './pages/Customers';
import DayBook from './pages/DayBook';
import AdminSettings from './pages/AdminSettings';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import Deliveries from './pages/Deliveries';
import InvoicePrint from './pages/InvoicePrint';
import Roles from './pages/Roles';
import NoAccess from './pages/NoAccess';
import SelectShop from './pages/SelectShop';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import { AppLayout } from './components/layout/AppLayout';

function App() {
  return (
    <div className="app-container w-full h-full">
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' } 
        }} 
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select-shop" element={<SelectShop />} />
        <Route path="/print/:id" element={<InvoicePrint />} />
        
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/daybook" element={<DayBook />} />
          <Route path="/admin" element={<AdminSettings />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/no-access" element={<NoAccess />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
