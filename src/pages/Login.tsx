import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';
import api from '../lib/api';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, user } = useAuth();

  const getRedirectPath = (u: any) => {
    if (!u) return '/login';
    if (u.is_superadmin || u.is_business_owner) return '/dashboard';
    const shopIds = Object.keys(u.shop_permissions || {});
    if (shopIds.length > 1) return '/select-shop';
    const perms = Object.values(u.shop_permissions || {}).flat();
    if (perms.length === 0) return '/no-access';
    if (perms.includes('dashboard:view')) return '/dashboard';
    if (perms.includes('pos:access')) return '/pos';
    if (perms.includes('inventory:list')) return '/inventory';
    if (perms.includes('customers:list')) return '/customers';
    if (perms.includes('invoices:list')) return '/invoices';
    return '/no-access';
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const form = document.getElementById('login-form') as HTMLFormElement;
        if (form && form.requestSubmit) {
          form.requestSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);
  if (isAuthenticated && !isLoading) {
    return <Navigate to={getRedirectPath(user)} replace />;
  }

  if (isLoading) return null; 

  const submitLogin = async () => {
    if (!phone || !password) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/login', { phone, password });
      if (res.data.refreshToken) {
        localStorage.setItem('kallapetty_refresh_token', res.data.refreshToken);
      }
      await login(res.data.token, res.data.user);
      navigate(getRedirectPath(res.data.user));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    submitLogin();
  };



  return (
    <div className="login-wrap">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', background: 'var(--bg-hover)', padding: '16px', borderRadius: '50%', marginBottom: '16px', border: '1px solid var(--border-light)' }}>
            <Lock size={28} color="var(--text-primary)" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em' }}>KallaPetty</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>Sign in to continue</p>
        </div>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '24px', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form id="login-form" onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label>Mobile Number</label>
            <input type="tel" placeholder="Enter your 10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <label>Password</label>
            <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '8px' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
