import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Store, LogOut } from 'lucide-react';

export default function SelectShop() {
  const { user, shops, currentShop, setCurrentShop, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const getRedirectPath = (u: any, shopId: string) => {
    if (!u) return '/login';
    if (u.is_superadmin || u.is_business_owner) return '/dashboard';
    
    // Check specific shop permissions
    const perms = u.shop_permissions?.[shopId] || [];
    if (perms.length === 0) return '/no-access';
    if (perms.includes('dashboard:view')) return '/dashboard';
    if (perms.includes('pos:access')) return '/pos';
    if (perms.includes('inventory:list')) return '/inventory';
    if (perms.includes('customers:list')) return '/customers';
    if (perms.includes('invoices:list')) return '/invoices';
    return '/no-access';
  };

  const handleSelectShop = (shop: any) => {
    setCurrentShop(shop);
    navigate(getRedirectPath(user, shop.id));
  };

  if (isLoading) return null;

  // If they already selected a shop, redirect them
  if (currentShop) {
    return <Navigate to={getRedirectPath(user, currentShop.id)} replace />;
  }

  // If they have no shops assigned
  if (!shops || shops.length === 0) {
    return <Navigate to="/no-access" replace />;
  }

  return (
    <div className="login-wrap" style={{ flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Select a Store</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome {user?.name}, please choose a store to enter.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', maxWidth: '800px' }}>
        {shops.map((shop) => (
          <div 
            key={shop.id} 
            onClick={() => handleSelectShop(shop)}
            className="card" 
            style={{ 
              width: '280px', 
              cursor: 'pointer', 
              transition: 'all 0.2s', 
              border: '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px 24px',
              textAlign: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-blue)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ background: 'var(--bg-hover)', padding: '20px', borderRadius: '50%', marginBottom: '16px', color: 'var(--accent-blue)' }}>
              <Store size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{shop.name}</h3>
          </div>
        ))}
      </div>

      <button onClick={logout} style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
        <LogOut size={16} /> Logout
      </button>
    </div>
  );
}
