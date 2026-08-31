import { useState, useEffect } from 'react';
import { Building2, Store, UserPlus, Edit } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDate, selectStyles } from '../lib/utils';
import Select from 'react-select';
import Modal from '../components/Modal';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'businesses' | 'shops' | 'users'>('businesses');
  
  const [, setStats] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [businessForm, setBusinessForm] = useState({ name: '', owner_phone: '' });
  const [shopForm, setShopForm] = useState({ business_id: '', name: '' });
  const [userForm, setUserForm] = useState({ business_id: '', phone: '', password: '', full_name: '' });

  // Edit Modals
  const [editModal, setEditModal] = useState<any>(null);
  const [customPayModal, setCustomPayModal] = useState<{ shop_id: string, baseDate: Date, daysToAdd: number, targetDate: string } | null>(null);
  const [selectedBusinessForShops, setSelectedBusinessForShops] = useState<any>(null);

  useEffect(() => { fetchData(); fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/businesses/stats');
      setStats(res.data.data);
    } catch (e) { console.error('Failed to load stats'); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, sRes, uRes] = await Promise.all([
        api.get('/businesses'),
        api.get('/shops'),
        api.get('/users')
      ]);
      const businessesData = bRes.data.data || [];
      setBusinesses(businessesData);
      setShops(sRes.data.data || []);
      setUsers(uRes.data.data || []);
      
      const filteredBusinesses = businessesData.filter((b: any) => b.name !== 'KallaPetty Master');
      if (filteredBusinesses.length > 0) {
        setShopForm(p => ({ ...p, business_id: p.business_id || filteredBusinesses[0].id }));
        setUserForm(p => ({ ...p, business_id: p.business_id || filteredBusinesses[0].id }));
      }
    } catch (error) { toast.error('Failed to load data'); } 
    finally { setLoading(false); }
  };

  const handleDirect30Days = async (shopId: string) => {
    try {
      await api.post(`/shops/${shopId}/pay`, { days_to_add: 30 });
      toast.success('+30 Days added successfully!');
      fetchData();
    } catch (error) { toast.error('Failed to extend subscription'); }
  };

  const openCustomPay = (shop: any) => {
    let base = new Date();
    if (shop.is_active && shop.subscription_end_date && new Date(shop.subscription_end_date) > new Date()) {
      base = new Date(shop.subscription_end_date);
    }
    const target = new Date(base);
    target.setDate(target.getDate() + 30);
    
    setCustomPayModal({
      shop_id: shop.id,
      baseDate: base,
      daysToAdd: 30,
      targetDate: target.toISOString().split('T')[0]
    });
  };

  const handleDaysChange = (days: any) => {
    if (!customPayModal) return;
    const newDate = new Date(customPayModal.baseDate);
    if (days !== '') newDate.setDate(newDate.getDate() + Number(days));
    setCustomPayModal({ ...customPayModal, daysToAdd: days, targetDate: newDate.toISOString().split('T')[0] });
  };

  const handleDateChange = (dateString: string) => {
    if (!customPayModal) return;
    const newDate = new Date(dateString);
    const diffTime = newDate.getTime() - customPayModal.baseDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setCustomPayModal({ ...customPayModal, targetDate: dateString, daysToAdd: diffDays });
  };

  const handleSubmitCustomPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPayModal) return;
    try {
      await api.post(`/shops/${customPayModal.shop_id}/pay`, { end_date: new Date(customPayModal.targetDate).toISOString() });
      toast.success('Subscription extended successfully!');
      setCustomPayModal(null);
      fetchData(); // Refresh the shops data
    } catch (error) { toast.error('Failed to extend subscription'); }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/businesses', businessForm);
      toast.success('Business created!');
      setBusinessForm({ name: '', owner_phone: '' });
      fetchData(); fetchStats();
    } catch (error) { toast.error('Failed to create business'); }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/shops', shopForm);
      toast.success('Shop created!');
      setShopForm({ ...shopForm, name: '' });
      fetchData(); fetchStats();
    } catch (error) { toast.error('Failed to create shop'); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', { ...userForm, is_business_owner: true });
      toast.success('Owner credential created!');
      setUserForm({ ...userForm, phone: '', password: '', full_name: '' });
      fetchData(); fetchStats();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to create owner'); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editModal.type === 'business') {
        const payload: any = { 
          name: editModal.data.name, 
          owner_phone: editModal.data.owner_phone,
          is_active: editModal.data.is_active
        };
        if (editModal.data.subscription_end_date) {
          payload.subscription_end_date = new Date(editModal.data.subscription_end_date).toISOString();
        }
        await api.put(`/businesses/${editModal.data.id}`, payload);
      } else if (editModal.type === 'shop') {
        await api.put(`/shops/${editModal.data.id}`, { name: editModal.data.name });
      } else if (editModal.type === 'user') {
        await api.put(`/users/${editModal.data.id}`, { phone: editModal.data.phone, password: editModal.data.password || undefined, full_name: editModal.data.full_name });
      }
      toast.success('Updated successfully!');
      setEditModal(null);
      fetchData();
      fetchStats();
    } catch (error) { toast.error('Failed to update'); }
  };

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Super Admin Portal</h1>
          <p className="page-subtitle">Global SaaS metrics and tenant management</p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-light)', overflowX: 'auto', paddingBottom: '8px' }}>
        <button onClick={() => setActiveTab('businesses')} className={`nav-link ${activeTab === 'businesses' ? 'active' : ''}`} style={{ whiteSpace: 'nowrap', border: 'none', background: activeTab === 'businesses' ? 'var(--bg-hover)' : 'transparent', color: activeTab === 'businesses' ? '#fff' : '#aaa', cursor: 'pointer' }}><Building2 size={16}/> Businesses</button>
        <button onClick={() => setActiveTab('shops')} className={`nav-link ${activeTab === 'shops' ? 'active' : ''}`} style={{ whiteSpace: 'nowrap', border: 'none', background: activeTab === 'shops' ? 'var(--bg-hover)' : 'transparent', color: activeTab === 'shops' ? '#fff' : '#aaa', cursor: 'pointer' }}><Store size={16}/> Global Shops</button>
        <button onClick={() => setActiveTab('users')} className={`nav-link ${activeTab === 'users' ? 'active' : ''}`} style={{ whiteSpace: 'nowrap', border: 'none', background: activeTab === 'users' ? 'var(--bg-hover)' : 'transparent', color: activeTab === 'users' ? '#fff' : '#aaa', cursor: 'pointer' }}><UserPlus size={16}/> Credentials</button>
      </div>

      {loading && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading data...</p>}

      {!loading && (
        <>
          {/* TAB 1: BUSINESSES */}
          {activeTab === 'businesses' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} color="var(--accent-blue)" />
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Tenant Businesses (Clients)</h2>
                </div>
              </div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-app)' }}>
                <form onSubmit={handleCreateBusiness} className="flex-row gap-4 items-end">
                  <div style={{ flex: 1 }}><label>Company Name</label><input required value={businessForm.name} onChange={e => setBusinessForm({...businessForm, name: e.target.value})} placeholder="e.g. Acme Corp" /></div>
                  <div style={{ flex: 1 }}><label>Owner Phone</label><input required value={businessForm.owner_phone} onChange={e => setBusinessForm({...businessForm, owner_phone: e.target.value})} placeholder="e.g. 9876543210" /></div>
                  <button type="submit" className="btn btn-primary" style={{ height: '46px' }}>Add Client</button>
                </form>
              </div>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead><tr><th>Business Name</th><th>Status</th><th>Sub. End Date</th><th>Shops</th><th>Users</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {businesses.filter(b => b.name !== 'KallaPetty Master').length === 0 ? <tr><td colSpan={6} style={{textAlign:'center', padding:'40px'}}>No businesses</td></tr> : businesses.filter(b => b.name !== 'KallaPetty Master').map(b => {
                      const isExpired = b.subscription_end_date && new Date(b.subscription_end_date) < new Date();
                      return (
                      <tr key={b.id}>
                        <td data-label="Business Name">
                          <div style={{ fontWeight: 500 }}>{b.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{b.owner_phone}</div>
                        </td>
                        <td data-label="Status">
                          <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: b.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: b.is_active ? 'var(--success)' : 'var(--danger)' }}>
                            {b.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td data-label="Sub. End Date">
                          {b.subscription_end_date ? (
                            <span style={{ color: isExpired ? 'var(--danger)' : 'inherit', fontWeight: isExpired ? 600 : 400 }}>
                              {formatDate(b.subscription_end_date)}
                            </span>
                          ) : <span style={{ color: 'var(--text-secondary)' }}>Lifetime</span>}
                        </td>
                        <td data-label="Shops">
                          <button 
                            onClick={() => setSelectedBusinessForShops(b)} 
                            style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            {b._count?.shops || 0} Shops (Manage Billing)
                          </button>
                        </td>
                        <td data-label="Users">{b._count?.users || 0}</td>
                        <td data-label="Action" style={{ textAlign: 'right' }}><button onClick={() => setEditModal({ type: 'business', data: {...b, subscription_end_date: b.subscription_end_date ? new Date(b.subscription_end_date).toISOString().split('T')[0] : ''} })} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '6px' }}><Edit size={14} color="var(--text-secondary)" /></button></td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SHOPS */}
          {activeTab === 'shops' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={18} color="var(--success)" />
                <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Global Shops Database</h2>
              </div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-app)' }}>
                <form onSubmit={handleCreateShop} className="flex-row gap-4 items-end">
                  <div style={{ flex: 1 }}>
                    <label>Target Business</label>
                    <Select 
                      options={businesses.filter(b => b.name !== 'KallaPetty Master').map(b => ({ value: b.id, label: b.name }))}
                      value={shopForm.business_id ? { value: shopForm.business_id, label: businesses.find(b => b.id === shopForm.business_id)?.name } : null}
                      onChange={(opt: any) => setShopForm({...shopForm, business_id: opt?.value || ''})}
                      styles={selectStyles}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}><label>Shop Name</label><input required value={shopForm.name} onChange={e => setShopForm({...shopForm, name: e.target.value})} placeholder="e.g. T-Nagar Branch" /></div>
                  <button type="submit" className="btn btn-primary" style={{ height: '46px' }}>Add Shop</button>
                </form>
              </div>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead><tr><th>Shop Name</th><th>Parent Business ID</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {shops.filter(s => s.business_id === shopForm.business_id).length === 0 ? (
                      <tr><td colSpan={3} style={{textAlign:'center', padding:'40px'}}>No shops found for this business.</td></tr>
                    ) : shops.filter(s => s.business_id === shopForm.business_id).map(s => (
                      <tr key={s.id}>
                        <td data-label="Shop Name" style={{ fontWeight: 500 }}>{s.name}</td>
                        <td data-label="Business ID"><span style={{ fontSize: '12px', fontFamily: 'monospace', background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px' }}>{s.business_id.split('-')[0]}</span></td>
                        <td data-label="Action" style={{ textAlign: 'right' }}><button onClick={() => setEditModal({ type: 'shop', data: {...s} })} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '6px' }}><Edit size={14} color="var(--text-secondary)" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: USERS */}
          {activeTab === 'users' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="var(--warning)" />
                <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Owner Credentials</h2>
              </div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-app)' }}>
                <form onSubmit={handleCreateUser} className="flex-row gap-4 items-end">
                  <div style={{ flex: 1 }}>
                    <label>Target Business</label>
                    <Select 
                      options={businesses.filter(b => b.name !== 'KallaPetty Master').map(b => ({ value: b.id, label: b.name }))}
                      value={userForm.business_id ? { value: userForm.business_id, label: businesses.find(b => b.id === userForm.business_id)?.name } : null}
                      onChange={(opt: any) => setUserForm({...userForm, business_id: opt?.value || ''})}
                      styles={selectStyles}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}><label>Owner Name</label><input required value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} placeholder="e.g. Ramesh" /></div>
                  <div style={{ flex: 1 }}><label>Mobile Number</label><input type="tel" required value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} placeholder="10-digit mobile" /></div>
                  <div style={{ flex: 1 }}><label>Password</label><input required type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} /></div>
                  <button type="submit" className="btn btn-primary" style={{ height: '46px' }}>Add Owner</button>
                </form>
              </div>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead><tr><th>Name</th><th>Mobile (Login ID)</th><th>Business</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {users.filter(u => u.is_business_owner && u.business_id === userForm.business_id).length === 0 ? (
                      <tr><td colSpan={5} style={{textAlign:'center', padding:'40px'}}>No credentials found for this business.</td></tr>
                    ) : users.filter(u => u.is_business_owner && u.business_id === userForm.business_id).map(u => {
                      const b = businesses.find(biz => biz.id === u.business_id);
                      return (
                      <tr key={u.id}>
                        <td data-label="Name">
                          <div style={{ fontWeight: 500 }}>{u.full_name || 'No Name'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>Owner</div>
                        </td>
                        <td data-label="Mobile" style={{ fontWeight: 500 }}>{u.phone}</td>
                        <td data-label="Business">
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>{b?.name || 'Unknown'}</span>
                        </td>
                        <td data-label="Status">
                          <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: u.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: u.is_active ? 'var(--success)' : 'var(--danger)' }}>
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td data-label="Action" style={{ textAlign: 'right' }}><button onClick={() => setEditModal({ type: 'user', data: {...u, password: ''} })} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '6px' }}><Edit size={14} color="var(--text-secondary)" /></button></td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <Modal 
          title={`Edit ${editModal.type.charAt(0).toUpperCase() + editModal.type.slice(1)}`}
          onClose={() => setEditModal(null)}
          width="480px"
        >
          <form onSubmit={handleUpdate} className="modal-body">
              {editModal.type === 'business' && (
                <>
                  <div style={{ marginBottom: '16px' }}><label>Business Name</label><input value={editModal.data.name} onChange={e => setEditModal({...editModal, data: {...editModal.data, name: e.target.value}})} required /></div>
                  <div style={{ marginBottom: '16px' }}><label>Owner Phone</label><input value={editModal.data.owner_phone} onChange={e => setEditModal({...editModal, data: {...editModal.data, owner_phone: e.target.value}})} required /></div>
                  <div style={{ marginBottom: '16px' }}>
                    <label>Subscription End Date (Leave blank for Lifetime)</label>
                    <input type="date" value={editModal.data.subscription_end_date} onChange={e => setEditModal({...editModal, data: {...editModal.data, subscription_end_date: e.target.value}})} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={editModal.data.is_active} onChange={e => setEditModal({...editModal, data: {...editModal.data, is_active: e.target.checked}})} style={{ width: '18px', height: '18px' }} />
                      <span style={{ fontWeight: 500 }}>Is Active (Uncheck to suspend client)</span>
                    </label>
                  </div>
                </>
              )}
              {editModal.type === 'shop' && (
                <div style={{ marginBottom: '16px' }}><label>Shop Name</label><input value={editModal.data.name} onChange={e => setEditModal({...editModal, data: {...editModal.data, name: e.target.value}})} required /></div>
              )}
              {editModal.type === 'user' && (
                <>
                  <div style={{ marginBottom: '16px' }}><label>Full Name</label><input value={editModal.data.full_name || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, full_name: e.target.value}})} required /></div>
                  <div style={{ marginBottom: '16px' }}><label>Mobile Number</label><input type="tel" value={editModal.data.phone} onChange={e => setEditModal({...editModal, data: {...editModal.data, phone: e.target.value}})} required /></div>
                  <div style={{ marginBottom: '16px' }}><label>New Password (leave blank to keep current)</label><input type="password" value={editModal.data.password} onChange={e => setEditModal({...editModal, data: {...editModal.data, password: e.target.value}})} /></div>
                </>
              )}
              <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '16px', width: '100%' }}>Save Changes</button>
            </form>
        </Modal>
      )}

      {/* SHOP BILLING MODAL */}
      {selectedBusinessForShops && (
        <Modal 
          title={`${selectedBusinessForShops.name} - Shop Billing`}
          onClose={() => setSelectedBusinessForShops(null)}
          width="800px"
        >
          <div className="modal-body" style={{ padding: 0 }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0, maxHeight: '400px', overflowY: 'auto' }}>
                <table>
                  <thead><tr><th>Shop Name</th><th>Start Date</th><th>Last Paid</th><th>Due Date</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                  <tbody>
                    {shops.filter(s => s.business_id === selectedBusinessForShops.id).length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No shops exist for this business.</td></tr>
                    ) : shops.filter(s => s.business_id === selectedBusinessForShops.id).map(s => {
                      // Check if 30 days have passed
                      const isExpired = s.subscription_end_date ? new Date() > new Date(s.subscription_end_date) : true;
                      
                      return (
                        <tr key={s.id}>
                          <td data-label="Shop Name" style={{ fontWeight: 500 }}>{s.name}</td>
                          <td data-label="Start Date">{formatDate(s.subscription_start_date)}</td>
                          <td data-label="Last Paid">{formatDate(s.last_paid_date)}</td>
                          <td data-label="Due Date">
                            <span style={{ color: isExpired ? 'var(--danger)' : 'inherit', fontWeight: isExpired ? 600 : 400 }}>
                              {s.subscription_end_date ? formatDate(s.subscription_end_date) : 'Unpaid'}
                            </span>
                          </td>
                          <td data-label="Status">
                            <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: !isExpired ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: !isExpired ? 'var(--success)' : 'var(--danger)' }}>
                              {!isExpired ? 'Active' : 'Expired'}
                            </span>
                          </td>
                          <td data-label="Action" style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                type="button"
                                onClick={() => handleDirect30Days(s.id)} 
                                style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                              >
                                +30 Days
                              </button>
                              <button 
                                type="button"
                                onClick={() => openCustomPay(s)} 
                                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                              >
                                Custom
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
        </Modal>
      )}

      {/* CUSTOM PAY MODAL */}
      {customPayModal && (
        <Modal 
          title="Custom Subscription Duration"
          onClose={() => setCustomPayModal(null)}
        >
          <form onSubmit={handleSubmitCustomPay} className="modal-body">
             <div style={{ textAlign: 'center', marginBottom: '24px' }}>
               <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Due Date: <span style={{ color: 'var(--accent-blue)' }}>{formatDate(customPayModal.targetDate)}</span></h3>
             </div>
             
             <div className="flex-row gap-4" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <label>Select Expiry Date</label>
                  <input type="date" value={customPayModal.targetDate} onChange={e => handleDateChange(e.target.value)} required />
                </div>
                
                <div style={{ padding: '32px 16px', color: 'var(--text-secondary)' }}>
                  OR
                </div>

                <div style={{ flex: 1 }}>
                  <label>Number of Days to Add</label>
                  <input type="number" value={customPayModal.daysToAdd} onChange={e => handleDaysChange(e.target.value === '' ? '' : parseInt(e.target.value))} required />
                </div>
             </div>
             
             <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '32px', width: '100%' }}>Confirm Extension</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
