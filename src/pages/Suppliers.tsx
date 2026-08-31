import { useState, useEffect } from 'react';
import { Briefcase, IndianRupee, Edit, Plus } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

export default function Suppliers() {
  const { currentShop } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [formModal, setFormModal] = useState<any>(null); // null when closed, object for Add/Edit
  
  const [paymentModal, setPaymentModal] = useState<any>(null);

  useEffect(() => { 
    if (currentShop) fetchData(); 
  }, [currentShop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data.data || []);
    } catch (error) { toast.error('Failed to load suppliers'); } 
    finally { setLoading(false); }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formModal.id) {
        // Edit mode
        await api.put(`/suppliers/${formModal.id}`, {
          name: formModal.name,
          phone: formModal.phone,
          gst_number: formModal.gst_number,
          address: formModal.address
        });
        toast.success('Supplier updated!');
      } else {
        // Add mode
        await api.post('/suppliers', {
          name: formModal.name,
          phone: formModal.phone,
          gst_number: formModal.gst_number,
          address: formModal.address
        });
        toast.success('Supplier added!');
      }
      setFormModal(null);
      fetchData();
    } catch (error: any) { 
      toast.error(error.response?.data?.message || 'Failed to save supplier'); 
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/suppliers/${paymentModal.supplier_id}/payments?shop_id=${currentShop.id}`, {
        amount_paid: Number(paymentModal.amount),
        payment_mode: paymentModal.received_via,
      });
      toast.success('Payment recorded successfully!');
      setPaymentModal(null);
      fetchData(); // refresh supplier balances
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage your vendors and their ledger balances</p>
        </div>
        <button className="btn btn-primary" onClick={() => setFormModal({ name: '', phone: '', gst_number: '', address: '' })} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} />
          <span className="desktop-only">Add Supplier</span>
        </button>
      </header>

      <div className="table-container">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={18} color="var(--text-secondary)" />
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Registered Suppliers</h2>
        </div>
        <table>
          <thead>
            <tr><th>Supplier Name</th><th>Phone</th><th>GST</th><th style={{ textAlign: 'right' }}>Outstanding Balance</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>Loading...</td></tr>) 
            : suppliers.length === 0 ? (<tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>No suppliers found</td></tr>) 
            : suppliers.map((s) => (
              <tr key={s.id}>
                <td data-label="Supplier Name" style={{ fontWeight: 500 }}>{s.name}</td>
                <td data-label="Phone">{s.phone || '-'}</td>
                <td data-label="GST">{s.gst_number || '-'}</td>
                <td data-label="Outstanding Balance" style={{ textAlign: 'right', fontWeight: 600, color: s.outstanding_balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  ₹{Number(s.outstanding_balance || 0).toFixed(2)}
                </td>
                <td data-label="Actions" style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button onClick={() => setFormModal(s)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }} title="Edit Supplier"><Edit size={16} color="var(--text-secondary)"/></button>
                  <button onClick={() => setPaymentModal({ supplier_id: s.id, amount: s.outstanding_balance || '', received_via: 'Bank' })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IndianRupee size={12} /> Make Payment
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paymentModal && (
        <Modal 
          title="Make Supplier Payment"
          onClose={() => setPaymentModal(null)}
          width="480px"
        >
          <form onSubmit={handleReceivePayment} className="modal-body">
              <div className="flex-row gap-4">
                <div style={{ flex: 1 }}><label>Amount Paid (₹)</label><input type="number" step="0.01" autoComplete="off" name="pay_amt_sup" value={paymentModal.amount} onChange={e => setPaymentModal({...paymentModal, amount: e.target.value})} required /></div>
                <div style={{ flex: 1 }}>
                  <label>Paid Via</label>
                  <Select
                    options={[{value: 'Cash', label: 'Cash'}, {value: 'UPI', label: 'UPI'}, {value: 'Bank', label: 'Bank Transfer'}]}
                    value={paymentModal.received_via ? {value: paymentModal.received_via, label: paymentModal.received_via} : null}
                    onChange={(opt: any) => setPaymentModal({...paymentModal, received_via: opt?.value})}
                    styles={{ ...selectStyles, menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '16px', width: '100%' }}>Confirm Payment</button>
            </form>
        </Modal>
      )}

      {formModal && (
        <Modal 
          title={formModal.id ? "Edit Supplier" : "Add Supplier"}
          onClose={() => setFormModal(null)}
          width="480px"
        >
          <form onSubmit={handleFormSubmit} className="modal-body">
              <div style={{ marginBottom: '16px' }}><label>Name</label><input value={formModal.name} onChange={e => setFormModal({...formModal, name: e.target.value})} required /></div>
              <div style={{ marginBottom: '16px' }}><label>Phone</label><input value={formModal.phone || ''} onChange={e => setFormModal({...formModal, phone: e.target.value})} /></div>
              <div style={{ marginBottom: '16px' }}><label>GST Number</label><input value={formModal.gst_number || ''} onChange={e => setFormModal({...formModal, gst_number: e.target.value})} /></div>
              <div style={{ marginBottom: '16px' }}><label>Address</label><input value={formModal.address || ''} onChange={e => setFormModal({...formModal, address: e.target.value})} /></div>
              <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '16px', width: '100%' }}>{formModal.id ? "Save Changes" : "Create Supplier"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
