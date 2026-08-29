import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Activity, DollarSign, Receipt, TrendingUp, Building2, Store, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Link, Navigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { formatDate } from '../lib/utils';

export default function Dashboard() {
  const { user, currentShop } = useAuth();
  
  // Tenant State
  const [stats, setStats] = useState({ sales: 0, pending: 0, count: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Founder State
  const [founderStats, setFounderStats] = useState<any>(null);
  const [founderLists, setFounderLists] = useState<any>({ businesses: [], shops: [], users: [] });
  const [dashboardModal, setDashboardModal] = useState<string | null>(null);

  const isSuperAdmin = user?.is_superadmin || (user as any)?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      Promise.all([
        api.get('/businesses/stats'),
        api.get('/businesses'),
        api.get('/shops'),
        api.get('/users')
      ]).then(([statsRes, bRes, sRes, uRes]) => {
        setFounderStats(statsRes.data.data);
        setFounderLists({
          businesses: bRes.data.data || [],
          shops: sRes.data.data || [],
          users: uRes.data.data || []
        });
      }).catch(console.error);
    } else {
      if (!currentShop) return;
      api.get(`/orders?shop_id=${currentShop.id}`).then(res => {
        const orders = res.data.data || [];
        let totalSales = 0; let totalPending = 0;
        const salesByDay: any = {};

        orders.forEach((o: any) => {
          const orderTotal = parseFloat(o.total_amount);
          const discount = parseFloat(o.discount_amount || 0);
          const paid = parseFloat(o.amount_paid);
          const net = orderTotal - discount;
          totalSales += net; totalPending += (net - paid);

          const date = formatDate(o.created_at);
          if (!salesByDay[date]) salesByDay[date] = { date, Sales: 0, Pending: 0 };
          salesByDay[date].Sales += paid;
          salesByDay[date].Pending += (net - paid);
        });

        setStats({ sales: totalSales, pending: totalPending, count: orders.length });
        setChartData(Object.values(salesByDay));
      }).catch(err => console.error(err));
    }
  }, [isSuperAdmin, currentShop]);
  
  const hasDashboardAccess = user?.is_superadmin || user?.is_business_owner || (currentShop && user?.shop_permissions?.[currentShop.id]?.includes('dashboard:view'));
  
  if (!hasDashboardAccess) {
    return <Navigate to="/no-access" replace />;
  }

  // --- FOUNDER DASHBOARD ---
  if (isSuperAdmin) {
    return (
      <div style={{ paddingBottom: '60px' }}>
        <header className="page-header" style={{ marginBottom: '32px' }}>
          <div>
            <h1 className="page-title">Founder Dashboard</h1>
            <p className="page-subtitle">Global live overview of your SaaS platform.</p>
          </div>
        </header>
        
        <div className="grid-3" style={{ marginBottom: '32px' }}>
          <div className="card" onClick={() => setDashboardModal('active')} style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}>
            <div className="flex-row items-center space-between">
              <h3 className="stat-title">Total Active Subscriptions</h3>
              <Building2 size={16} color="var(--success)" />
            </div>
            <p className="stat-value">{founderStats?.activeBusinesses || 0} <span style={{fontSize:'14px', color:'var(--text-secondary)'}}>/ {founderStats?.totalBusinesses || 0}</span></p>
          </div>
          <div className="card" onClick={() => setDashboardModal('shops')} style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}>
            <div className="flex-row items-center space-between">
              <h3 className="stat-title">Global Stores Online</h3>
              <Store size={16} color="var(--accent-blue)" />
            </div>
            <p className="stat-value" style={{ color: 'var(--accent-blue)' }}>{founderStats?.totalShops || 0}</p>
          </div>
          <div className="card" onClick={() => setDashboardModal('renewals')} style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--warning)' }} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 179, 8, 0.15)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}>
            <div className="flex-row items-center space-between">
              <h3 className="stat-title">Renewals Due (7 Days)</h3>
              <Activity size={16} color="var(--warning)" />
            </div>
            <p className="stat-value text-warning">{founderStats?.expiringSoon || 0}</p>
          </div>
          <div className="card" onClick={() => setDashboardModal('users')} style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}>
            <div className="flex-row items-center space-between">
              <h3 className="stat-title">Total System Credentials</h3>
              <Users size={16} color="var(--text-primary)" />
            </div>
            <p className="stat-value">{founderStats?.totalUsers || 0}</p>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Manage Your Tenants</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Go to Admin Settings to manage subscriptions, create shops, and disable inactive accounts.</p>
          <Link to="/admin" className="btn btn-primary" style={{ display: 'inline-block' }}>Go to Admin Settings</Link>
        </div>

        {/* MODALS */}
        {dashboardModal && (
          <Modal
            title={
              dashboardModal === 'active' ? 'Active Subscriptions' :
              dashboardModal === 'shops' ? 'Global Stores' :
              dashboardModal === 'renewals' ? 'Renewals Due (Next 7 Days)' :
              'System Credentials'
            }
            onClose={() => setDashboardModal(null)}
            width="80vw"
            maxWidth="none"
          >
            <div className="modal-body" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0, flex: 1, overflowY: 'auto' }}>
                  <table>
                    {dashboardModal === 'active' && (
                      <>
                        <thead><tr><th>Business Name</th><th>Owner Phone</th><th>Shops</th></tr></thead>
                        <tbody>
                          {founderLists.businesses.filter((b:any) => b.is_active && b.name !== 'KallaPetty Master').map((b:any) => (
                            <tr key={b.id}>
                              <td data-label="Name" style={{ fontWeight: 500 }}>{b.name}</td>
                              <td data-label="Phone">{b.owner_phone}</td>
                              <td data-label="Shops">{b._count?.shops || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                    {dashboardModal === 'shops' && (
                      <>
                        <thead><tr><th>Shop Name</th><th>Business</th><th>Status</th></tr></thead>
                        <tbody>
                          {founderLists.shops.map((s:any) => {
                            const b = founderLists.businesses.find((biz:any) => biz.id === s.business_id);
                            const isExpired = s.subscription_end_date ? new Date() > new Date(s.subscription_end_date) : true;
                            return (
                              <tr key={s.id}>
                                <td data-label="Name" style={{ fontWeight: 500 }}>{s.name}</td>
                                <td data-label="Business">{b?.name || '-'}</td>
                                <td data-label="Status">
                                  <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: !isExpired ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: !isExpired ? 'var(--success)' : 'var(--danger)' }}>
                                    {!isExpired ? 'Active' : 'Expired'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </>
                    )}
                    {dashboardModal === 'renewals' && (
                      <>
                        <thead><tr><th>Shop Name</th><th>Business</th><th>Due Date</th></tr></thead>
                        <tbody>
                          {founderLists.shops.filter((s:any) => {
                             if (!s.is_active) return false;
                             if (!s.subscription_end_date) return false;
                             const nextWeek = new Date();
                             nextWeek.setDate(nextWeek.getDate() + 7);
                             return new Date(s.subscription_end_date) <= nextWeek;
                          }).map((s:any) => {
                            const b = founderLists.businesses.find((biz:any) => biz.id === s.business_id);
                            return (
                              <tr key={s.id}>
                                <td data-label="Shop" style={{ fontWeight: 500 }}>{s.name}</td>
                                <td data-label="Business">{b?.name || '-'}</td>
                                <td data-label="Due Date" style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatDate(s.subscription_end_date)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </>
                    )}
                    {dashboardModal === 'users' && (
                      <>
                        <thead><tr><th>Mobile (Login ID)</th><th>Role</th><th>Business</th><th>Assigned Shops</th></tr></thead>
                        <tbody>
                          {founderLists.users.map((u:any) => {
                            const b = founderLists.businesses.find((biz:any) => biz.id === u.business_id);
                            const assignedShops = u.user_shops?.map((us:any) => us.shop?.name).filter(Boolean).join(', ') || '-';
                            return (
                              <tr key={u.id}>
                                <td data-label="Mobile" style={{ fontWeight: 500 }}>{u.phone || '-'}</td>
                                <td data-label="Role"><span style={{textTransform:'capitalize'}}>{u.role}</span></td>
                                <td data-label="Business">{b?.name || '-'}</td>
                                <td data-label="Assigned Shops">{assignedShops}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </>
                    )}
                  </table>
                </div>
              </div>
          </Modal>
        )}
      </div>
    );
  }

  // --- TENANT DASHBOARD ---
  return (
    <div style={{ paddingBottom: '60px' }}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}. Here is your sales overview.</p>
        </div>
      </header>
      
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="flex-row items-center space-between">
            <h3 className="stat-title">Total Revenue</h3>
            <DollarSign size={16} color="var(--success)" />
          </div>
          <p className="stat-value text-success">₹{stats.sales.toFixed(2)}</p>
        </div>
        <div className="card">
          <div className="flex-row items-center space-between">
            <h3 className="stat-title">Pending Amount</h3>
            <Activity size={16} color="var(--danger)" />
          </div>
          <p className="stat-value text-danger">₹{stats.pending.toFixed(2)}</p>
        </div>
        <div className="card">
          <div className="flex-row items-center space-between">
            <h3 className="stat-title">Bills Generated</h3>
            <Receipt size={16} color="var(--text-secondary)" />
          </div>
          <p className="stat-value">{stats.count}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-row items-center gap-2" style={{ marginBottom: '24px' }}>
            <TrendingUp size={18} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Cash Collection Trend</h2>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => `₹${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Area type="monotone" dataKey="Sales" stroke="var(--accent-blue)" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Not enough data to display trend
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-row items-center gap-2" style={{ marginBottom: '24px' }}>
            <Activity size={18} color="var(--danger)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Pending Amount Trend</h2>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => `₹${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--danger)' }}
                  />
                  <Bar dataKey="Pending" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Not enough data to display trend
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
