import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { useAuth } from '../contexts/AuthContext';
import { selectStyles } from '../lib/utils';
import Modal from '../components/Modal';

const MODULE_PERMISSIONS = [
  {
    module: 'Dashboard',
    actions: [
      { id: 'dashboard:view', label: 'View Dashboard' }
    ]
  },
  {
    module: 'POS & Sales',
    actions: [
      { id: 'pos:access', label: 'Access POS' }
    ]
  },
  {
    module: 'Invoices',
    actions: [
      { id: 'invoices:list', label: 'View List' },
      { id: 'invoices:view', label: 'View Details' }
    ]
  },
  {
    module: 'Inventory',
    actions: [
      { id: 'inventory:list', label: 'View List' },
      { id: 'inventory:view', label: 'View Details' },
      { id: 'inventory:add', label: 'Add Item' },
      { id: 'inventory:edit', label: 'Edit Item' },
      { id: 'inventory:delete', label: 'Delete Item' },
      { id: 'inventory:adjust', label: 'Adjust Stock' },
    ]
  },
  {
    module: 'Customers',
    actions: [
      { id: 'customers:list', label: 'View List' },
      { id: 'customers:view', label: 'View Details' },
      { id: 'customers:add', label: 'Add Customer' },
      { id: 'customers:edit', label: 'Edit Customer' },
      { id: 'customers:delete', label: 'Delete Customer' },
    ]
  },
  {
    module: 'Deliveries',
    actions: [
      { id: 'deliveries:list', label: 'View Deliveries' },
      { id: 'deliveries:view', label: 'View Details' },
      { id: 'deliveries:edit', label: 'Manage Deliveries' },
    ]
  },
  {
    module: 'Finance',
    actions: [
      { id: 'finance:read', label: 'View Day Book & Collections' },
    ]
  },
  {
    module: 'Staff',
    actions: [
      { id: 'staff:list', label: 'View List' },
      { id: 'staff:view', label: 'View Details' },
      { id: 'staff:add', label: 'Add Staff' },
      { id: 'staff:edit', label: 'Edit Staff' },
      { id: 'staff:delete', label: 'Delete Staff' },
      { id: 'staff:manage', label: 'Manage Roles & Assignments' },
    ]
  },
  {
    module: 'Settings',
    actions: [
      { id: 'settings:manage', label: 'Manage Store Settings' }
    ]
  }
];



export default function Roles() {
  const { user } = useAuth();
  
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  
  const [roles, setRoles] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [roleForm, setRoleForm] = useState<{name: string, permissions: string[]}>({ name: '', permissions: [] });
  const [editModal, setEditModal] = useState<any>(null);

  useEffect(() => {
    if (user?.is_superadmin) {
      fetchBusinesses();
    } else {
      fetchShops();
    }
  }, [user]);

  useEffect(() => {
    if (user?.is_superadmin && selectedBusinessId) {
      fetchShops(selectedBusinessId);
      setSelectedShopId('');
      setRoles([]);
    }
  }, [selectedBusinessId]);

  useEffect(() => {
    if (selectedShopId) {
      fetchRoles(selectedShopId);
    } else {
      setRoles([]);
    }
  }, [selectedShopId]);

  const fetchBusinesses = async () => {
    try {
      const res = await api.get('/businesses');
      const bList = (res.data.data || []).filter((b:any) => b.name !== 'KallaPetty Master');
      setBusinesses(bList);
      if (bList.length > 0) {
        setSelectedBusinessId(p => p || bList[0].id);
      } else {
        setLoading(false);
      }
    } catch (e) {
      toast.error('Failed to load businesses');
      setLoading(false);
    }
  };

  const fetchShops = async (businessId?: string) => {
    setLoading(true);
    try {
      const url = businessId ? `/shops?business_id=${businessId}` : '/shops';
      const res = await api.get(url);
      const fetchedShops = res.data.data || [];
      setShops(fetchedShops);
      if (fetchedShops.length > 0) {
        const nextId = selectedShopId || fetchedShops[0].id;
        setSelectedShopId(nextId);
        if (selectedShopId === nextId) {
          fetchRoles(nextId);
        }
      } else {
        setSelectedShopId('');
        setLoading(false);
      }
    } catch (error) {
      toast.error('Failed to load shops');
      setLoading(false);
    }
  };

  const fetchRoles = async (shopId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/roles?shop_id=${shopId}`);
      setRoles(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name) return toast.error('Role name is required');
    if (!selectedShopId) return toast.error('Please select a shop first');
    
    try {
      await api.post('/roles', { ...roleForm, shop_id: selectedShopId });
      toast.success('Role created successfully');
      setShowForm(false);
      setRoleForm({ name: '', permissions: [] });
      fetchRoles(selectedShopId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create role');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/roles/${editModal.id}`, { name: editModal.name, permissions: editModal.permissions });
      toast.success('Role updated successfully');
      setEditModal(null);
      if (selectedShopId) fetchRoles(selectedShopId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      toast.success('Role deleted successfully');
      if (selectedShopId) fetchRoles(selectedShopId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const togglePermission = (permId: string, formState: any, setFormState: any) => {
    setFormState((prev: any) => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter((p: string) => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  const renderPermissionsGrid = (formState: any, setFormState: any) => (
    <div className="table-container" style={{ marginTop: '12px' }}>
      <table>
        <thead>
          <tr>
            <th style={{ width: '220px' }}>Module</th>
            <th>Permissions</th>
          </tr>
        </thead>
        <tbody>
          {MODULE_PERMISSIONS.map((mod, i) => {
            const allChecked = mod.actions.every(a => formState.permissions.includes(a.id));
            const someChecked = mod.actions.some(a => formState.permissions.includes(a.id));
            
            const handleModuleToggle = () => {
              if (allChecked) {
                const actionIds = mod.actions.map(a => a.id);
                setFormState((prev: any) => ({ ...prev, permissions: prev.permissions.filter((p: string) => !actionIds.includes(p)) }));
              } else {
                const actionIds = mod.actions.map(a => a.id);
                setFormState((prev: any) => ({ ...prev, permissions: Array.from(new Set([...prev.permissions, ...actionIds])) }));
              }
            };

            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ fontWeight: 600, background: 'var(--bg-card)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: someChecked ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                    <input 
                      type="checkbox" 
                      checked={allChecked}
                      ref={input => { if (input) input.indeterminate = someChecked && !allChecked; }}
                      onChange={handleModuleToggle}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-blue)' }}
                    />
                    {mod.module}
                  </label>
                </td>
                <td style={{ background: 'var(--bg-app)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {mod.actions.map(a => (
                      <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={formState.permissions.includes(a.id)}
                          onChange={() => togglePermission(a.id, formState, setFormState)}
                          style={{ width: '15px', height: '15px', accentColor: 'var(--accent-blue)' }}
                        />
                        <span style={{ fontSize: '13px', userSelect: 'none', color: formState.permissions.includes(a.id) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{a.label}</span>
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Role Management</h1>
          <p className="page-subtitle">Define custom roles and their access permissions for each shop</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {user?.is_superadmin && (
            <div style={{ minWidth: '220px' }}>
              <Select 
                placeholder="Select Business..."
                options={businesses.map(b => ({ value: b.id, label: b.name }))}
                value={selectedBusinessId ? { value: selectedBusinessId, label: businesses.find(b => b.id === selectedBusinessId)?.name } : null}
                onChange={(opt: any) => setSelectedBusinessId(opt?.value || '')}
                styles={selectStyles}
              />
            </div>
          )}

          <div style={{ minWidth: '220px' }}>
            <Select 
              placeholder={shops.length === 0 ? "No shops" : "Select Shop..."}
              options={shops.map(s => ({ value: s.id, label: s.name }))}
              value={selectedShopId ? { value: selectedShopId, label: shops.find(s => s.id === selectedShopId)?.name } : null}
              onChange={(opt: any) => setSelectedShopId(opt?.value || '')}
              isDisabled={shops.length === 0}
              styles={selectStyles}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} disabled={!selectedShopId} style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px' }}>
            {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Cancel' : 'Create Role'}
          </button>
        </div>
      </header>

      {showForm && (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent-blue)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>New Custom Role</h3>
          <form onSubmit={handleCreateRole}>
            <div style={{ maxWidth: '400px', marginBottom: '20px' }}>
              <label>Role Name</label>
              <input value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} required placeholder="e.g. Cashier" />
            </div>
            
            <label style={{ fontWeight: 600 }}>Permissions</label>
            {renderPermissionsGrid(roleForm, setRoleForm)}
            
            <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }}>Create Role</button>
          </form>
        </div>
      )}

      <div className="table-container">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="var(--text-secondary)" />
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Available Roles</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Role Name</th>
              <th>Assigned Users</th>
              <th>Permissions</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>) 
            : roles.length === 0 ? (<tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>No roles defined</td></tr>) 
            : roles.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name} {r.name === 'Owner' && <span style={{ fontSize: '11px', background: 'var(--accent-blue)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>System Default</span>}</td>
                <td>{r._count?.user_shops || 0}</td>
                <td><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.permissions.length} permissions granted</span></td>
                <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditModal(r)} style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                  {r.name !== 'Owner' && (
                    <button onClick={() => handleDeleteRole(r.id)} style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editModal && (
        <Modal 
          title={`Edit Role: ${editModal.name}`}
          onClose={() => setEditModal(null)}
          width="800px"
        >
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <form onSubmit={handleUpdateRole}>
                <div style={{ maxWidth: '400px', marginBottom: '20px' }}>
                  <label>Role Name</label>
                  <input value={editModal.name} onChange={e => setEditModal({...editModal, name: e.target.value})} required disabled={editModal.name === 'Owner'} />
                </div>
                
                <label style={{ fontWeight: 600 }}>Permissions</label>
                {renderPermissionsGrid(editModal, setEditModal)}

                <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }}>Save Changes</button>
              </form>
            </div>
        </Modal>
      )}
    </div>
  );
}
