import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Wallet, LogOut, Settings, Users, BookOpen, X, FileText, Truck, Moon, Sun, ShieldCheck, Briefcase, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { selectStyles } from '../../lib/utils';

export function Sidebar({ isOpen, closeMenu, isCollapsed, toggleCollapse }: { isOpen?: boolean, closeMenu?: () => void, isCollapsed?: boolean, toggleCollapse?: () => void }) {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  const isSuperAdmin = user?.is_superadmin;
  const isOwner = user?.is_business_owner;
  const { currentShop, setCurrentShop, shops } = useAuth();

  const hasAnyPermission = (perm: string) => {
    if (isSuperAdmin || isOwner) return true;
    if (!currentShop || !user?.shop_permissions?.[currentShop.id]) return false;
    return user.shop_permissions[currentShop.id].includes(perm);
  };

  const navItems: any[] = [];

  if (isSuperAdmin) {
    navItems.push({ name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> });
    navItems.push({ name: 'Role Management', path: '/roles', icon: <ShieldCheck size={18} /> });
    navItems.push({ name: 'Admin Settings', path: '/admin', icon: <Settings size={18} /> });
  } else {
    // Basic dashboard for everyone who has permission
    if (hasAnyPermission('dashboard:view')) {
      navItems.push({ name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> });
    }

    if (hasAnyPermission('pos:access')) {
      navItems.push({ name: 'POS', path: '/pos', icon: <ShoppingCart size={18} /> });
    }
    if (hasAnyPermission('invoices:list')) {
      navItems.push({ name: 'Invoices', path: '/invoices', icon: <FileText size={18} /> });
    }
    if (hasAnyPermission('deliveries:list')) {
      navItems.push({ name: 'Deliveries', path: '/deliveries', icon: <Truck size={18} /> });
    }
    if (hasAnyPermission('inventory:list')) {
      navItems.push({ name: 'Inventory', path: '/inventory', icon: <Package size={18} /> });
    }
    // Added Suppliers and Purchases for inventory management
    if (hasAnyPermission('inventory:list')) {
      navItems.push({ name: 'Suppliers', path: '/suppliers', icon: <Briefcase size={18} /> });
      navItems.push({ name: 'Purchases', path: '/purchases', icon: <ShoppingBag size={18} /> });
    }
    if (hasAnyPermission('customers:list')) {
      navItems.push({ name: 'Customers', path: '/customers', icon: <Users size={18} /> });
    }
    if (hasAnyPermission('finance:read')) {
      navItems.push({ name: 'Day Book', path: '/daybook', icon: <BookOpen size={18} /> });
      navItems.push({ name: 'Pending Collections', path: '/finance', icon: <Wallet size={18} /> });
    }
    if (isOwner) {
      navItems.push({ name: 'Staff Management', path: '/staff', icon: <Users size={18} /> });
      navItems.push({ name: 'Business Profile', path: '/settings', icon: <Settings size={18} /> });
    }
  }

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div style={{ marginBottom: '24px', padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h2 
            data-tooltip={isCollapsed ? "KallaPetty" : undefined}
            style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em', textAlign: 'left' }}
          >
            <span className="desktop-only">{isCollapsed ? 'K' : 'KallaPetty'}</span>
            <span className="mobile-only">KallaPetty</span>
          </h2>
          <p className="hide-on-collapse" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'capitalize' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', marginRight: '6px', verticalAlign: 'middle' }}></span>
            {isSuperAdmin ? 'Super Admin' : isOwner ? 'Business Owner' : (currentShop && user?.shop_roles?.[currentShop.id]) ? user.shop_roles[currentShop.id] : 'Staff'}
          </p>
        </div>
        <button 
          className="desktop-only" 
          onClick={toggleCollapse} 
          data-tooltip={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px' }} 
          onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'} 
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <button className="mobile-only" onClick={closeMenu} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar">
        
        {/* Shop Switcher */}
        {shops.length > 1 && !isSuperAdmin && (
          <div className="hide-on-collapse" style={{ padding: '0 12px', marginBottom: '24px' }}>
            <Select
              options={shops.map(s => ({ value: s.id, label: s.name }))}
              value={currentShop ? { value: currentShop.id, label: currentShop.name } : null}
              onChange={(opt: any) => {
                const shop = shops.find(s => s.id === opt?.value);
                setCurrentShop(shop || null);
              }}
              styles={selectStyles}
              placeholder="Select a Store..."
            />
          </div>
        )}
        
        <nav>
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path}
              className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
              data-tooltip={item.name}
            >
              {item.icon}
              <span className="hide-on-collapse">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <button 
          onClick={toggleTheme} 
          className="nav-link" 
          data-tooltip={theme === 'light' ? 'Dark Mode' : 'Light Mode'} 
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-secondary)' }} 
          onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'} 
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          <span className="hide-on-collapse">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        <button 
          onClick={logout} 
          className="nav-link" 
          data-tooltip="Logout" 
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }} 
          onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} 
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={18} />
          <span className="hide-on-collapse">Logout</span>
        </button>
      </div>
    </div>
  );
}
