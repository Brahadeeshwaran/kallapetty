import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export function AppLayout() {
  const { isAuthenticated, isLoading, currentShop, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="login-wrap" style={{ flexDirection: 'column', gap: '16px' }}>
         <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-light)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
         <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Restoring Session...</p>
         <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (isAuthenticated && !currentShop && !window.location.pathname.includes('/select-shop') && !window.location.pathname.includes('/no-access')) {
    const isGlobalAccess = user?.is_superadmin || user?.is_business_owner;
    const isGlobalRoute = window.location.pathname.includes('/dashboard') || window.location.pathname.includes('/admin');
    
    if (!(isGlobalAccess && isGlobalRoute)) {
      return <Navigate to="/select-shop" replace />;
    }
  }

  return (
    <div className="app-layout">
      {/* Mobile Top Navbar */}
      <div className="mobile-header">
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>KallaPetty</h2>
        <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <Menu size={24} />
        </button>
      </div>

      <Sidebar isOpen={isMobileMenuOpen} closeMenu={() => setIsMobileMenuOpen(false)} />
      
      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
