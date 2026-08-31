import { useState, useEffect } from 'react';
import { Truck, Search, CheckCircle, Clock, Package, Eye } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/utils';
import Modal from '../components/Modal';

import { useAuth } from '../contexts/AuthContext';

export default function Deliveries() {
  const { currentShop } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'shipped', 'delivered'
  const [viewOrder, setViewOrder] = useState<any>(null);

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
          
          <div className="custom-scrollbar" style={{ display: 'flex', gap: '8px', background: 'var(--bg-app)', padding: '4px', borderRadius: '8px', overflowX: 'auto', maxWidth: '100%' }}>
            <button onClick={() => setStatusFilter('pending')} style={{ flexShrink: 0, padding: '6px 16px', border: 'none', background: statusFilter === 'pending' ? '#f59e0b' : 'transparent', color: statusFilter === 'pending' ? 'white' : 'var(--text-secondary)', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Pending
            </button>
            <button onClick={() => setStatusFilter('shipped')} style={{ flexShrink: 0, padding: '6px 16px', border: 'none', background: statusFilter === 'shipped' ? '#3b82f6' : 'transparent', color: statusFilter === 'shipped' ? 'white' : 'var(--text-secondary)', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={14} /> Shipped
            </button>
            <button onClick={() => setStatusFilter('delivered')} style={{ flexShrink: 0, padding: '6px 16px', border: 'none', background: statusFilter === 'delivered' ? 'var(--success)' : 'transparent', color: statusFilter === 'delivered' ? 'white' : 'var(--text-secondary)', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} /> Delivered
            </button>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        title="View Details"
                        onClick={() => setViewOrder(order)} 
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <Eye size={14} />
                        <span className="mobile-hide">View</span>
                      </button>

                      {order.delivery_status !== 'delivered' ? (
                        <>
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
                        </>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right', marginLeft: '8px' }}>
                          Delivered on<br/>{order.delivered_at ? new Date(order.delivered_at).toLocaleDateString() : 'N/A'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewOrder && (
        <Modal
          title={`Delivery Details - ${viewOrder.id.split('-')[0].toUpperCase()}`}
          onClose={() => setViewOrder(null)}
          width="600px"
        >
          <div className="modal-body" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: 'var(--bg-hover)', padding: '16px', borderRadius: '8px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Customer</p>
                <p style={{ fontWeight: 500, fontSize: '14px' }}>{viewOrder.customer?.name || 'Walk-in Customer'}</p>
                {viewOrder.customer?.phone && <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{viewOrder.customer.phone}</p>}
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Expected Delivery Date</p>
                <p style={{ fontWeight: 500, fontSize: '14px' }}>{viewOrder.expected_delivery ? formatDate(viewOrder.expected_delivery) : 'Not specified'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Delivery Status</p>
                <span style={{ 
                  fontSize: '12px', padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize', display: 'inline-block',
                  background: viewOrder.delivery_status === 'delivered' ? 'rgba(16, 185, 129, 0.1)' : viewOrder.delivery_status === 'shipped' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: viewOrder.delivery_status === 'delivered' ? 'var(--success)' : viewOrder.delivery_status === 'shipped' ? '#3b82f6' : '#f59e0b' 
                }}>
                  {viewOrder.delivery_status || 'pending'}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Address</p>
                <p style={{ fontWeight: 500, fontSize: '14px' }}>{viewOrder.delivery_address || 'No address provided'}</p>
              </div>
            </div>

            {viewOrder.delivery_notes && (
              <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', borderRadius: '6px', fontSize: '14px' }}>
                <span style={{ fontWeight: 600 }}>Delivery Notes: </span>{viewOrder.delivery_notes}
              </div>
            )}

            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Items to Deliver</h4>
            <div className="table-container" style={{ border: '1px solid var(--border-light)', margin: 0, padding: 0 }}>
              <table style={{ margin: 0 }}>
                <thead style={{ background: 'var(--bg-hover)' }}>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {viewOrder.order_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td data-label="Product" style={{ fontWeight: 500 }}>{item.product?.name || 'Unknown'}</td>
                      <td data-label="Qty" style={{ textAlign: 'center' }}>{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', fontSize: '14px' }}>
              <div style={{ display: 'flex', width: '250px', justifyContent: 'space-between', fontWeight: 500, fontSize: '14px' }}>
                <span>Bill Status:</span>
                <span style={{ 
                  textTransform: 'capitalize',
                  color: viewOrder.status === 'paid' ? 'var(--success)' : viewOrder.status === 'partial' ? '#f59e0b' : 'var(--danger)' 
                }}>
                  {viewOrder.status}
                </span>
              </div>
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
}
