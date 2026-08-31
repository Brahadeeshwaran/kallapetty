import { useState, useEffect } from 'react';
import { Users, Plus, X, Trash2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    password: '',
    shop_roles: [] as { shop_id: string, role_id: string }[]
  });

  useEffect(() => {
    fetchShops();
    fetchStaff();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await api.get('/shops');
      const fetchedShops = res.data.data || [];
      setShops(fetchedShops);
      // Fetch roles for all shops
      const map: Record<string, any[]> = {};
      await Promise.all(fetchedShops.map(async (s: any) => {
        const rolesRes = await api.get(`/roles?shop_id=${s.id}`);
        map[s.id] = rolesRes.data.data || [];
      }));
      setRolesMap(map);
    } catch (error) {
      toast.error('Failed to load shops or roles');
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      // Filter out superadmins and business owners so only staff is shown
      const staffList = (res.data.data || []).filter((u: any) => !u.is_superadmin && !u.is_business_owner);
      setStaff(staffList);
    } catch (error) {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setFormData({ id: '', name: '', phone: '', password: '', shop_roles: [] });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleOpenEdit = (u: any) => {
    const assignments = (u.user_shops || []).map((us: any) => ({
      shop_id: us.shop_id,
      role_id: us.role_id
    }));
    
    setFormData({
      id: u.id,
      name: u.full_name || '',
      phone: u.phone,
      password: '',
      shop_roles: assignments
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const addAssignment = () => {
    if (formData.shop_roles.length >= shops.length) {
      return toast.error('You have already assigned all available shops.');
    }
    setFormData(prev => ({
      ...prev,
      shop_roles: [...prev.shop_roles, { shop_id: '', role_id: '' }]
    }));
  };

  const removeAssignment = (index: number) => {
    setFormData(prev => {
      const newAssignments = [...prev.shop_roles];
      newAssignments.splice(index, 1);
      return { ...prev, shop_roles: newAssignments };
    });
  };

  const updateAssignment = (index: number, field: 'shop_id' | 'role_id', value: string) => {
    setFormData(prev => {
      const newAssignments = [...prev.shop_roles];
      newAssignments[index] = { ...newAssignments[index], [field]: value };
      // if shop changes, reset role
      if (field === 'shop_id') {
        newAssignments[index].role_id = '';
      }
      return { ...prev, shop_roles: newAssignments };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return toast.error('Name and phone are required');
    if (!isEditing && !formData.password) return toast.error('Password is required for new staff');
    
    // Validate assignments
    const validAssignments = formData.shop_roles.filter(sr => sr.shop_id && sr.role_id);
    
    const payload: any = {
      full_name: formData.name,
      phone: formData.phone,
      shop_roles: validAssignments
    };
    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      if (isEditing) {
        // First update user details
        await api.put(`/users/${formData.id}`, { full_name: formData.name, phone: formData.phone, password: formData.password });
        // Then update shop roles
        await api.put(`/users/${formData.id}/shops`, { shop_roles: validAssignments });
        toast.success('Staff updated successfully');
      } else {
        await api.post('/users', payload);
        toast.success('Staff created successfully');
      }
      setShowForm(false);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save staff');
    }
  };

  const handleDelete = async (_id: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      // NOTE: User deletion might not be supported if we only deactivate them usually. 
      // But if there's no endpoint, this will fail. KallaPetty doesn't have DELETE /users.
      // So we should probably just deactivate them or throw an error.
      toast.error('Deletion is not supported. Please use the disable option.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete staff');
    }
  };

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Manage your staff and assign them specific roles per shop</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => handleOpenNew()} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span className="desktop-only">Add Staff</span>
          </button>
        )}
      </header>

      {showForm && (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{isEditing ? 'Edit Staff Member' : 'New Staff Member'}</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label>Name</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Staff Name" />
              </div>
              <div>
                <label>Phone Number (10 digits)</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required placeholder="1234567890" />
              </div>
              <div>
                <label>Password {isEditing && <span style={{fontSize:'12px', color:'var(--text-secondary)'}}>(Leave blank to keep current)</span>}</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={isEditing ? '••••••••' : 'Password'} required={!isEditing} />
              </div>
            </div>
            
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontWeight: 600, margin: 0 }}>Shop Assignments & Roles</label>
                <button type="button" onClick={addAssignment} style={{ background: 'transparent', color: 'var(--primary)', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={14} /> Add Assignment
                </button>
              </div>
              
              {formData.shop_roles.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px dashed var(--border-light)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No shops assigned. This staff member will not have access to any shop.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formData.shop_roles.map((assignment, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-hover)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div style={{ flex: 1 }}>
                        <Select
                          options={shops.map(s => {
                            const isSelectedElsewhere = formData.shop_roles.some((sr, i) => sr.shop_id === s.id && i !== index);
                            return { value: s.id, label: `${s.name} ${isSelectedElsewhere ? '(Already Assigned)' : ''}`, isDisabled: isSelectedElsewhere };
                          })}
                          value={assignment.shop_id ? { value: assignment.shop_id, label: shops.find(s => s.id === assignment.shop_id)?.name } : null}
                          onChange={(opt: any) => updateAssignment(index, 'shop_id', opt?.value || '')}
                          styles={selectStyles}
                          placeholder="Select Shop..."
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Select
                          options={(assignment.shop_id && rolesMap[assignment.shop_id] ? rolesMap[assignment.shop_id] : []).map(r => ({ value: r.id, label: r.name }))}
                          value={assignment.role_id ? { value: assignment.role_id, label: (rolesMap[assignment.shop_id] || []).find(r => r.id === assignment.role_id)?.name } : null}
                          onChange={(opt: any) => updateAssignment(index, 'role_id', opt?.value || '')}
                          isDisabled={!assignment.shop_id}
                          styles={selectStyles}
                          placeholder="Select Role..."
                        />
                      </div>
                      <button type="button" onClick={() => removeAssignment(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Save Changes' : 'Create Staff'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="var(--text-secondary)" />
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Staff List</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Assigned Shops & Roles</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>) 
            : staff.length === 0 ? (<tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>No staff members found</td></tr>) 
            : staff.map((u) => (
              <tr key={u.id}>
                <td data-label="Name" style={{ fontWeight: 600 }}>{u.full_name || 'No Name'}</td>
                <td data-label="Phone">{u.phone}</td>
                <td data-label="Assigned Shops & Roles">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(u.user_shops || []).length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No assignments</span>
                    ) : (
                      (u.user_shops || []).map((us: any, i: number) => (
                        <span key={i} style={{ fontSize: '12px', background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                          <span style={{ fontWeight: 600 }}>{us.shop?.name}</span>: {us.role?.name}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td data-label="Action" style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => handleOpenEdit(u)} style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                  <button onClick={() => handleDelete(u.id)} style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
