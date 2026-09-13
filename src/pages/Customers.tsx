import { useState, useEffect } from 'react';
import { Users, IndianRupee, Plus, AlertTriangle, Loader2, Edit } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

export default function Customers() {
  const { currentShop } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms & Loading states
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', gst_number: '', address: '', opening_balance: '', opening_balance_type: 'to_receive' });
  const [duplicateWarning, setDuplicateWarning] = useState<{ reason: string; existing: any } | null>(null);
  const [editModal, setEditModal] = useState<any>(null);
  
  const [paymentModal, setPaymentModal] = useState<any>(null); // { customer_id, shop_id, amount, received_via }

  useEffect(() => { 
    if (currentShop) fetchData(); 
  }, [currentShop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const cRes = await api.get(`/customers?shop_id=${currentShop.id}`);
      setCustomers(cRes.data.data || []);
    } catch (error) { toast.error('Failed to load customers'); } 
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setCustomerForm({ name: '', phone: '', gst_number: '', address: '', opening_balance: '', opening_balance_type: 'to_receive' });
    setDuplicateWarning(null);
  };

  const handleAddCustomer = async (e?: React.FormEvent, forceSave = false) => {
    if (e) e.preventDefault();

    const trimmedName = customerForm.name.trim();
    const trimmedPhone = customerForm.phone.trim();

    if (!forceSave) {
      // Check if a customer with exact same name or mobile number exists
      const existingByName = customers.find(
        c => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      const existingByPhone = trimmedPhone 
        ? customers.find(c => c.phone && c.phone.trim() === trimmedPhone) 
        : null;

      if (existingByName || existingByPhone) {
        let reason = '';
        if (existingByName && existingByPhone) {
          reason = `Name "${existingByName.name}" & Mobile Number "${existingByPhone.phone}"`;
        } else if (existingByName) {
          reason = `Name "${existingByName.name}"`;
        } else {
          reason = `Mobile Number "${existingByPhone?.phone}"`;
        }
        
        setDuplicateWarning({
          reason,
          existing: existingByName || existingByPhone
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.post('/customers', {
        name: trimmedName,
        phone: trimmedPhone || undefined,
        gst_number: customerForm.gst_number.trim() || undefined,
        address: customerForm.address.trim() || undefined,
        opening_balance: customerForm.opening_balance ? parseFloat(customerForm.opening_balance) : 0,
        opening_balance_type: customerForm.opening_balance_type
      });
      toast.success('Customer added successfully!');
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error: any) { 
      toast.error(error.response?.data?.message || 'Failed to add customer'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    setIsSubmitting(true);
    try {
      await api.put(`/customers/${editModal.id}`, {
        name: editModal.name.trim(),
        phone: editModal.phone ? editModal.phone.trim() : undefined,
        gst_number: editModal.gst_number ? editModal.gst_number.trim().toUpperCase() : undefined,
        address: editModal.address ? editModal.address.trim() : undefined,
        opening_balance: editModal.opening_balance ? parseFloat(editModal.opening_balance) : 0,
        opening_balance_type: editModal.opening_balance_type || 'to_receive'
      });
      toast.success('Customer updated successfully!');
      setEditModal(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/finance/payments', paymentModal);
      toast.success('Payment received!');
      setPaymentModal(null);
      fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to receive payment'); }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Customers (Khata)</h1>
          <p className="page-subtitle">Manage customer ledger, address, GST and collect pending dues</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => { setShowForm(true); resetForm(); }} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span className="desktop-only">Add Customer</span>
          </button>
        )}
      </header>
      
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>New Customer Details</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <form onSubmit={e => handleAddCustomer(e)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Customer Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="Enter Customer / Shop Name" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Mobile Number</label>
                <input value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="e.g. 9876543210" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>GST Number</label>
                <input value={customerForm.gst_number} onChange={e => setCustomerForm({...customerForm, gst_number: e.target.value.toUpperCase()})} placeholder="e.g. 33AAAAA0000A1Z5" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Opening Balance (₹)</label>
                <input type="number" step="0.01" value={customerForm.opening_balance} onChange={e => setCustomerForm({...customerForm, opening_balance: e.target.value})} placeholder="0.00" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Balance Type</label>
                <select 
                  value={customerForm.opening_balance_type} 
                  onChange={e => setCustomerForm({...customerForm, opening_balance_type: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '14px' }}
                >
                  <option value="to_receive">To Receive (Customer owes you)</option>
                  <option value="to_pay">To Pay (You owe customer / Advance)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Address</label>
              <textarea value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} placeholder="Enter street, city, pincode..." style={{ minHeight: '60px', width: '100%', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ height: '42px', minWidth: '110px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Customer</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="var(--text-secondary)" />
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Registered Customers</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone</th>
              <th>GST Number</th>
              <th>Address</th>
              <th style={{ textAlign: 'right' }}>Due Amount</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>Loading customers...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>No customers found</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id}>
                <td data-label="Customer Name" style={{ fontWeight: 500 }}>{c.name}</td>
                <td data-label="Phone">{c.phone || 'N/A'}</td>
                <td data-label="GST Number" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{c.gst_number || 'N/A'}</td>
                <td data-label="Address" style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.address || ''}>
                  {c.address || 'N/A'}
                </td>
                <td data-label="Due Amount" style={{ textAlign: 'right', fontWeight: 600, color: c.due_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  ₹{(c.due_amount || 0).toFixed(2)}
                </td>
                <td data-label="Actions" style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button onClick={() => setEditModal({ id: c.id, name: c.name, phone: c.phone || '', gst_number: c.gst_number || '', address: c.address || '', opening_balance: c.opening_balance || '', opening_balance_type: c.opening_balance_type || 'to_receive' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }} title="Edit Customer"><Edit size={16} color="var(--text-secondary)"/></button>
                  <button onClick={() => setPaymentModal({ customer_id: c.id, shop_id: currentShop.id, amount: c.due_amount || '', received_via: 'Cash' })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IndianRupee size={12} /> Collect Due
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Customer Modal */}
      {editModal && (
        <Modal 
          title="Edit Customer"
          onClose={() => setEditModal(null)}
          width="480px"
        >
          <form onSubmit={handleUpdateCustomer} className="modal-body">
            <div style={{ marginBottom: '16px' }}><label>Customer Name <span style={{ color: 'var(--danger)' }}>*</span></label><input value={editModal.name} onChange={e => setEditModal({...editModal, name: e.target.value})} required /></div>
            <div style={{ marginBottom: '16px' }}><label>Mobile Number</label><input value={editModal.phone || ''} onChange={e => setEditModal({...editModal, phone: e.target.value})} placeholder="e.g. 9876543210" /></div>
            <div style={{ marginBottom: '16px' }}><label>GST Number</label><input value={editModal.gst_number || ''} onChange={e => setEditModal({...editModal, gst_number: e.target.value.toUpperCase()})} placeholder="e.g. 33AAAAA0000A1Z5" /></div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Opening Balance (₹)</label>
                <input type="number" step="0.01" value={editModal.opening_balance || ''} onChange={e => setEditModal({...editModal, opening_balance: e.target.value})} placeholder="0.00" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Balance Type</label>
                <select 
                  value={editModal.opening_balance_type || 'to_receive'} 
                  onChange={e => setEditModal({...editModal, opening_balance_type: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '14px' }}
                >
                  <option value="to_receive">To Receive (Customer owes you)</option>
                  <option value="to_pay">To Pay (You owe customer / Advance)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}><label>Address</label><textarea value={editModal.address || ''} onChange={e => setEditModal({...editModal, address: e.target.value})} placeholder="Street, City, Pincode" style={{ minHeight: '60px', width: '100%', resize: 'vertical' }}></textarea></div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '14px', marginTop: '16px', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </form>
        </Modal>
      )}

      {/* Duplicate Warning Confirmation Modal */}
      {duplicateWarning && (
        <Modal 
          title="Duplicate Customer Alert"
          onClose={() => setDuplicateWarning(null)}
          width="460px"
        >
          <div className="modal-body" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertTriangle size={24} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: 0, color: 'var(--danger)', fontSize: '15px', fontWeight: 600 }}>Already Exists!</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-primary)' }}>
                  A customer matching <strong>{duplicateWarning.reason}</strong> is already registered.
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Existing Record:</div>
              <div style={{ color: 'var(--text-secondary)' }}>Name: <strong style={{ color: 'var(--text-primary)' }}>{duplicateWarning.existing.name}</strong></div>
              <div style={{ color: 'var(--text-secondary)' }}>Phone: <strong style={{ color: 'var(--text-primary)' }}>{duplicateWarning.existing.phone || 'N/A'}</strong></div>
              {duplicateWarning.existing.gst_number && <div style={{ color: 'var(--text-secondary)' }}>GST: <strong style={{ color: 'var(--text-primary)' }}>{duplicateWarning.existing.gst_number}</strong></div>}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Do you want to acknowledge and proceed to save this entry as a new customer anyway?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setDuplicateWarning(null)}
                disabled={isSubmitting}
              >
                Cancel & Edit
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleAddCustomer(undefined, true)}
                disabled={isSubmitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Yes, Acknowledge & Save</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {paymentModal && (
        <Modal 
          title="Receive Payment (Due)"
          onClose={() => setPaymentModal(null)}
          width="480px"
        >
          <form onSubmit={handleReceivePayment} className="modal-body">
              <div className="flex-row gap-4">
                <div style={{ flex: 1 }}><label>Amount Received (₹)</label><input type="number" step="0.01" autoComplete="off" name="pay_amt_cust" value={paymentModal.amount} onChange={e => setPaymentModal({...paymentModal, amount: e.target.value})} required /></div>
                <div style={{ flex: 1 }}>
                  <label>Received Via</label>
                  <Select
                    options={[{value: 'Cash', label: 'Cash'}, {value: 'UPI', label: 'UPI'}]}
                    value={paymentModal.received_via ? {value: paymentModal.received_via, label: paymentModal.received_via} : null}
                    onChange={(opt: any) => setPaymentModal({...paymentModal, received_via: opt?.value})}
                    styles={selectStyles}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '16px', width: '100%' }}>Confirm Payment</button>
            </form>
        </Modal>
      )}
    </div>
  );
}

