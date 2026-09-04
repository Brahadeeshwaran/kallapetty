import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api, { setAccessToken } from '../lib/api';

export interface User {
  id: string;
  name: string;
  shop_permissions: Record<string, string[]>;
  shop_roles?: Record<string, string>;
  business_id?: string;
  is_superadmin: boolean;
  is_business_owner: boolean;
}

interface AuthContextType {
  user: User | null;
  shops: any[];
  currentShop: any | null;
  setCurrentShop: (shop: any | null) => void;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [currentShop, setCurrentShop] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSetCurrentShop = (shop: any | null) => {
    setCurrentShop(shop);
    if (shop) {
      localStorage.setItem('kallapetty_active_shop_id', shop.id);
    } else {
      localStorage.removeItem('kallapetty_active_shop_id');
    }
  };

  const loadShops = async () => {
    try {
      const res = await api.get('/shops');
      const fetchedShops = res.data.data || [];
      setShops(fetchedShops);
      if (fetchedShops.length === 1) {
        handleSetCurrentShop(fetchedShops[0]);
      } else if (fetchedShops.length > 1) {
        const savedShopId = localStorage.getItem('kallapetty_active_shop_id');
        const savedShop = fetchedShops.find((s: any) => s.id === savedShopId);
        if (savedShop) {
          handleSetCurrentShop(savedShop);
        } else {
          handleSetCurrentShop(null);
        }
      } else {
        handleSetCurrentShop(null);
      }
    } catch(e) { console.error('Failed to load shops', e); }
  };

  useEffect(() => {
    // 1. Initial Load: Check if we have a valid cookie session
    const initAuth = async () => {
      try {
        const storedRefreshToken = localStorage.getItem('kallapetty_refresh_token');
        const res = await api.post('/auth/refresh', { refreshToken: storedRefreshToken });
        
        if (res.data.refreshToken) {
          localStorage.setItem('kallapetty_refresh_token', res.data.refreshToken);
        }

        setAccessToken(res.data.token);
        setUser(res.data.user);
        await loadShops();
      } catch (error) {
        // No valid cookie exists, user must log in manually
        localStorage.removeItem('kallapetty_refresh_token');
      } finally {
        setIsLoading(false); // Stop loading screen
      }
    };

    initAuth();

    // 2. Global listener for when the refresh token dies
    const handleAuthFailed = () => {
      setUser(null);
      setAccessToken('');
    };
    
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => window.removeEventListener('auth-failed', handleAuthFailed);
  }, []);

  const login = async (token: string, userData: User) => {
    setIsLoading(true);
    setAccessToken(token);
    await loadShops();
    setUser(userData);
    setIsLoading(false);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout'); // Clear cookie on backend
    } catch(e) {
      console.error('Logout failed', e);
    }
    localStorage.removeItem('kallapetty_refresh_token');
    setAccessToken('');
    setUser(null);
    setShops([]);
    handleSetCurrentShop(null);
  };

  return (
    <AuthContext.Provider value={{ user, shops, currentShop, setCurrentShop: handleSetCurrentShop, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
