import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Menu, Maximize, Minimize } from 'lucide-react';

export function AppLayout() {
  const { isAuthenticated, isLoading, currentShop, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Swipe gesture states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe && touchStart < 50) {
      // Swiped right from the left edge (open sidebar)
      setIsMobileMenuOpen(true);
    }
    if (isLeftSwipe && isMobileMenuOpen) {
      // Swiped left while sidebar is open (close sidebar)
      setIsMobileMenuOpen(false);
    }
  };

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
    <div 
      className="app-layout"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Mobile Top Navbar */}
      <div className="mobile-header">
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>KallaPetty</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={toggleFullscreen} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Toggle Fullscreen">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Menu size={24} />
          </button>
        </div>
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
