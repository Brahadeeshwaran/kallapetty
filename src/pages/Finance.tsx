import { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';
import Modal from '../components/Modal';

export default function Finance() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<any>(null);

  const fetchOrders = () => {
    api.get('/orders').then(res => {
      setOrders(res.data.data || []);
      setLoading(false);
    }).catch(() => { toast.error('Failed to load financial records'); setLoading(false); });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    try {
      await api.put(`/orders/${paymentModal.id}/mark-paid`, { 
        amount: parseFloat(paymentModal.amount), 
        received_via: paymentModal.received_via 
      });
      toast.success('Payment recorded!');
      setPaymentModal(null);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'unpaid' || o.status === 'partial');

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Pending Collections</h1>
          <p className="page-subtitle">Track pending collections and manage ledgers</p>
        </div>
      </header>
      
      <div className="table-container">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wallet size={18} color="var(--text-secondary)" />
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Pending Collections</h2>
        </div>
        <table>
          <thead>
            <tr><th>Order ID</th><th>Total Amount</th><th>Paid Amount</th><th>Balance</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>Loading records...</td></tr>
            ) : pendingOrders.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>No pending collections! You're all caught up.</td></tr>
            ) : pendingOrders.map(o => {
              const total = parseFloat(o.total_amount) - parseFloat(o.discount_amount || 0);
              const paid = parseFloat(o.amount_paid);
              const balance = total - paid;
              
              return (
                <tr key={o.id}>
                  <td data-label="Order ID"><span style={{ background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{o.id.split('-')[0]}</span></td>
                  <td data-label="Total" style={{ fontWeight: 500 }}>₹{total.toFixed(2)}</td>
                  <td data-label="Paid" style={{ color: 'var(--success)' }}>₹{paid.toFixed(2)}</td>
                  <td data-label="Balance" style={{ color: 'var(--danger)', fontWeight: 600 }}>₹{balance.toFixed(2)}</td>
                  <td data-label="Action" style={{ textAlign: 'right' }}>
                    <button onClick={() => setPaymentModal({ id: o.id, amount: balance.toString(), received_via: 'Cash' })} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }}>Mark Paid</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {paymentModal && (
        <Modal 
          title="Receive Partial/Full Payment"
          onClose={() => setPaymentModal(null)}
          width="480px"
        >
          <form onSubmit={handleMarkPaid} className="modal-body">
              <div className="flex-row gap-4">
                <div style={{ flex: 1 }}>
                  <label>Amount Received (₹)</label>
                  <input type="number" step="0.01" autoComplete="off" name="pay_amt_fin" value={paymentModal.amount} onChange={e => setPaymentModal({...paymentModal, amount: e.target.value})} required />
                </div>
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
