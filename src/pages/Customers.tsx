import { useState, useEffect } from 'react';
import { Users, IndianRupee } from 'lucide-react';
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

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '' });
  
  const [paymentModal, setPaymentModal] = useState<any>(null); // { customer_id, shop_id, amount, received_via }

  useEffect(() => { 
    if (currentShop) fetchData(); 
  }, [currentShop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // NOTE: Customers are usually global per business, but we pass shop_id just in case the backend requires it or wants to filter
      const cRes = await api.get(`/customers?shop_id=${currentShop.id}`);
      setCustomers(cRes.data.data || []);
    } catch (error) { toast.error('Failed to load customers'); } 
    finally { setLoading(false); }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', customerForm);
      toast.success('Customer added!');
      setShowForm(false);
      setCustomerForm({ name: '', phone: '' });
      fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to add'); }
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
          <p className="page-subtitle">Manage customer ledger and collect pending dues</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add Customer'}</button>
      </header>
      
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>New Customer Details</h3>
          <form onSubmit={handleAddCustomer} className="flex-row gap-4 items-end">
            <div style={{ flex: 1 }}><label>Name</label><input value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} required /></div>
            <div style={{ flex: 1 }}><label>Phone Number</label><input value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} /></div>
            <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Save</button>
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
            <tr><th>Customer Name</th><th>Phone</th><th style={{ textAlign: 'right' }}>Due Amount</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>Loading...</td></tr>) 
            : customers.length === 0 ? (<tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>No customers found</td></tr>) 
            : customers.map((c) => (
              <tr key={c.id}>
                <td data-label="Customer Name" style={{ fontWeight: 500 }}>{c.name}</td>
                <td data-label="Phone">{c.phone || 'N/A'}</td>
                <td data-label="Due Amount" style={{ textAlign: 'right', fontWeight: 600, color: c.due_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  ₹{(c.due_amount || 0).toFixed(2)}
                </td>
                <td data-label="Actions" style={{ textAlign: 'right' }}>
                  <button onClick={() => setPaymentModal({ customer_id: c.id, shop_id: currentShop.id, amount: c.due_amount || '', received_via: 'Cash' })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IndianRupee size={12} /> Collect Due
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paymentModal && (
        <Modal 
          title="Receive Payment (Due)"
          onClose={() => setPaymentModal(null)}
          width="480px"
        >
          <form onSubmit={handleReceivePayment} className="modal-body">
              <div className="flex-row gap-4">
                <div style={{ flex: 1 }}><label>Amount Received (₹)</label><input type="number" step="0.01" value={paymentModal.amount} onChange={e => setPaymentModal({...paymentModal, amount: e.target.value})} required /></div>
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
