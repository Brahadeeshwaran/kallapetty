import { useState, useEffect } from 'react';
import { FileText, Search, Printer } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/utils';

import { useAuth } from '../contexts/AuthContext';

export default function Invoices() {
  const { currentShop } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentShop) fetchOrders();
  }, [currentShop]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders?shop_id=${currentShop.id}`);
      setOrders(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.customer?.name && o.customer.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Invoices History</h1>
          <p className="page-subtitle">View and reprint past bills</p>
        </div>
      </header>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>All Generated Bills</h2>
          </div>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search by Bill No or Customer..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', width: '100%', height: '36px' }}
            />
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No invoices found</td></tr>
              ) : filteredOrders.map(order => (
                <tr key={order.id}>
                  <td data-label="Bill No" style={{ fontFamily: 'monospace', fontWeight: 500, fontSize: '13px' }}>
                    {order.id.split('-')[0].toUpperCase()}
                  </td>
                  <td data-label="Date">{formatDate(order.created_at)}</td>
                  <td data-label="Customer">
                    <span style={{ fontWeight: 500 }}>{order.customer?.name || 'Walk-in Customer'}</span>
                  </td>
                  <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{parseFloat(order.total_amount).toFixed(2)}
                  </td>
                  <td data-label="Status">
                    <span style={{ 
                      fontSize: '12px', padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize',
                      background: order.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : order.status === 'partial' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: order.status === 'paid' ? 'var(--success)' : order.status === 'partial' ? '#f59e0b' : 'var(--danger)' 
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => window.open(`/print/${order.id}`, '_blank')}
                      style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500 }}
                    >
                      <Printer size={14} color="var(--text-secondary)" />
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
