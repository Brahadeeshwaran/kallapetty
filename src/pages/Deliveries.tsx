import { useState, useEffect } from 'react';
import { Truck, Search, CheckCircle, Clock, Package } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/utils';

import { useAuth } from '../contexts/AuthContext';

export default function Deliveries() {
  const { currentShop } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'shipped', 'delivered'

  useEffect(() => {
    if (currentShop) fetchDeliveries();
  }, [currentShop]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders?shop_id=${currentShop.id}`);
      // Only include orders that are of type 'delivery'
      const deliveryOrders = (res.data.data || []).filter((o: any) => o.order_type === 'delivery');
      setOrders(deliveryOrders);
    } catch (error) {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/orders/${id}/delivery-status`, {
        delivery_status: newStatus
      });
      toast.success('Delivery status updated');
      fetchDeliveries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                          (o.customer?.name && o.customer.name.toLowerCase().includes(search.toLowerCase()));
    
    // Fallback if delivery_status is null
    const status = o.delivery_status || 'pending';
    const matchesStatus = status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Delivery Management</h1>
          <p className="page-subtitle">Track and update dispatch statuses</p>
        </div>
      </header>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Delivery Orders</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-app)', padding: '4px', borderRadius: '8px' }}>
            <button onClick={() => setStatusFilter('pending')} style={{ padding: '6px 16px', border: 'none', background: statusFilter === 'pending' ? '#f59e0b' : 'transparent', color: statusFilter === 'pending' ? 'white' : 'var(--text-secondary)', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Pending
            </button>
            <button onClick={() => setStatusFilter('shipped')} style={{ padding: '6px 16px', border: 'none', background: statusFilter === 'shipped' ? '#3b82f6' : 'transparent', color: statusFilter === 'shipped' ? 'white' : 'var(--text-secondary)', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={14} /> Shipped
            </button>
            <button onClick={() => setStatusFilter('delivered')} style={{ padding: '6px 16px', border: 'none', background: statusFilter === 'delivered' ? 'var(--success)' : 'transparent', color: statusFilter === 'delivered' ? 'white' : 'var(--text-secondary)', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} /> Delivered
            </button>
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
                <th>Expected Date</th>
                <th>Customer</th>
                <th>Items to Deliver</th>
                <th>Address & Notes</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No deliveries found for this status</td></tr>
              ) : filteredOrders.map(order => (
                <tr key={order.id}>
                  <td data-label="Bill No" style={{ fontFamily: 'monospace', fontWeight: 500, fontSize: '13px' }}>
                    {order.id.split('-')[0].toUpperCase()}
                  </td>
                  <td data-label="Expected Date">
                    {order.expected_delivery ? formatDate(order.expected_delivery) : 'Not specified'}
                  </td>
                  <td data-label="Customer">
                    <div style={{ fontWeight: 500 }}>{order.customer?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{order.customer?.phone}</div>
                  </td>
                  <td data-label="Items to Deliver">
                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {order.order_items?.map((item: any) => (
                        <li key={item.id}>{item.qty} x <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.product?.name || 'Unknown Item'}</span></li>
                      ))}
                    </ul>
                  </td>
                  <td data-label="Address & Notes">
                    <div style={{ fontSize: '13px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.delivery_address}>
                      {order.delivery_address || 'No address provided'}
                    </div>
                    {order.delivery_notes && (
                      <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px' }}>Note: {order.delivery_notes}</div>
                    )}
                  </td>
                  <td data-label="Status">
                    <span style={{ 
                      fontSize: '12px', padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize',
                      background: order.delivery_status === 'delivered' ? 'rgba(16, 185, 129, 0.1)' : order.delivery_status === 'shipped' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: order.delivery_status === 'delivered' ? 'var(--success)' : order.delivery_status === 'shipped' ? '#3b82f6' : '#f59e0b' 
                    }}>
                      {order.delivery_status || 'pending'}
                    </span>
                  </td>
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    {order.delivery_status !== 'delivered' && (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {(order.delivery_status === 'pending' || !order.delivery_status) && (
                           <button 
                             onClick={() => handleUpdateStatus(order.id, 'shipped')}
                             className="btn btn-secondary"
                             style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                           >
                             <Package size={14} /> Dispatch
                           </button>
                        )}
                        {(order.delivery_status === 'shipped') && (
                           <button 
                             onClick={() => handleUpdateStatus(order.id, 'delivered')}
                             className="btn btn-primary"
                             style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                           >
                             <CheckCircle size={14} /> Deliver
                           </button>
                        )}
                      </div>
                    )}
                    {order.delivery_status === 'delivered' && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Delivered on<br/>{order.delivered_at ? new Date(order.delivered_at).toLocaleDateString() : 'N/A'}
                      </span>
                    )}
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
