import { useState, useEffect } from 'react';
import { FileText, Search, Printer, Eye } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/utils';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

export default function Invoices() {
  const { currentShop } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [printCopyType, setPrintCopyType] = useState('Original');
  const [customPrintCopy, setCustomPrintCopy] = useState('');
  const [viewOrder, setViewOrder] = useState<any>(null);

  const [editingTransport, setEditingTransport] = useState(false);
  const [editTransportName, setEditTransportName] = useState('');
  const [editLrNumber, setEditLrNumber] = useState('');
  const [editLrDate, setEditLrDate] = useState('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [editDeliveryNotes, setEditDeliveryNotes] = useState('');
  const [editIsInterstate, setEditIsInterstate] = useState(false);

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

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Invoices History</h1>
          <p className="page-subtitle">View and reprint past bills</p>
        </div>
      </header>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>All Generated Bills</h2>
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search by Bill No or Customer..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
              ) : paginatedOrders.map(order => (
                <tr key={order.id}>
                  <td data-label="Bill No" style={{ fontFamily: 'monospace', fontWeight: 500, fontSize: '13px' }}>
                    {order.invoice_number || order.id.split('-')[0].toUpperCase()}
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
                      <button 
                        title="Print Invoice"
                        onClick={() => {
                          setPrintOrder(order);
                          setPrintCopyType('Original');
                          setCustomPrintCopy('');
                        }}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <Printer size={14} />
                        <span className="mobile-hide">Print</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>

      {printOrder && (
        <Modal
          title="Print Options"
          onClose={() => setPrintOrder(null)}
          width="400px"
        >
          <div className="modal-body" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Select Copy Type:</label>
              <select 
                value={printCopyType} 
                onChange={e => setPrintCopyType(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-light)', marginBottom: '12px', fontSize: '14px' }}
              >
                <option value="Original">Original</option>
                <option value="Duplicate">Duplicate</option>
                <option value="Transport">Transport</option>
                <option value="Custom">Custom...</option>
              </select>
              {printCopyType === 'Custom' && (
                <input 
                  type="text" 
                  placeholder="Enter custom label" 
                  value={customPrintCopy}
                  onChange={e => setCustomPrintCopy(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '14px' }}
                />
              )}
            </div>
            <button 
              onClick={() => {
                const label = printCopyType === 'Custom' ? customPrintCopy : printCopyType;
                window.open(`/print/${printOrder.id}?label=${encodeURIComponent(label)}`, '_blank');
                setPrintOrder(null);
              }}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px' }}
            >
              Print Invoice
            </button>
          </div>
        </Modal>
      )}

      {viewOrder && (
        <Modal
          title={`Bill Details - ${viewOrder.invoice_number || viewOrder.id.split('-')[0].toUpperCase()}`}
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
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date & Time</p>
                <p style={{ fontWeight: 500, fontSize: '14px' }}>{formatDate(viewOrder.created_at)}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</p>
                <span style={{ 
                  fontSize: '12px', padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize', display: 'inline-block',
                  background: viewOrder.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : viewOrder.status === 'partial' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: viewOrder.status === 'paid' ? 'var(--success)' : viewOrder.status === 'partial' ? '#f59e0b' : 'var(--danger)' 
                }}>
                  {viewOrder.status}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Order Type</p>
                <p style={{ fontWeight: 500, fontSize: '14px', textTransform: 'capitalize' }}>{viewOrder.order_type}</p>
              </div>
            </div>

            <div style={{ marginBottom: '24px', background: 'var(--bg-hover)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingTransport ? '12px' : '0' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Transport Details</h4>
                  {!editingTransport && (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      {viewOrder.transport_name ? (
                        <><strong>{viewOrder.transport_name}</strong> | LR: {viewOrder.lr_number || '-'} | Date: {viewOrder.lr_date ? formatDate(viewOrder.lr_date) : '-'}</>
                      ) : (
                        'No transport details entered yet.'
                      )}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (!editingTransport) {
                      setEditTransportName(viewOrder.transport_name || '');
                      setEditLrNumber(viewOrder.lr_number || '');
                      setEditLrDate(viewOrder.lr_date || '');
                      setEditDeliveryAddress(viewOrder.delivery_address || '');
                      setEditDeliveryNotes(viewOrder.delivery_notes || '');
                      setEditIsInterstate(Boolean(viewOrder.is_interstate));
                    }
                    setEditingTransport(!editingTransport);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  {editingTransport ? 'Cancel' : (viewOrder.transport_name || viewOrder.delivery_address) ? 'Edit Shipping & Transport' : '+ Add Shipping & Transport'}
                </button>
              </div>

              {editingTransport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    <input 
                      type="checkbox" 
                      id="editInterstate" 
                      checked={editIsInterstate} 
                      onChange={e => setEditIsInterstate(e.target.checked)} 
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                    <label htmlFor="editInterstate" style={{ margin: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Apply IGST (Out of State Sale)
                    </label>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', marginBottom: '4px' }}>Delivery / Dispatch Address</label>
                    <textarea 
                      placeholder="Enter delivery address (e.g., Door No, Street, City, State)" 
                      value={editDeliveryAddress} 
                      onChange={e => setEditDeliveryAddress(e.target.value)} 
                      style={{ minHeight: '50px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', marginBottom: '4px' }}>Transport Name</label>
                    <input type="text" placeholder="e.g. Rajalakshmi Transport" value={editTransportName} onChange={e => setEditTransportName(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', marginBottom: '4px' }}>LR No. / Docket No.</label>
                      <input type="text" placeholder="e.g. 239" value={editLrNumber} onChange={e => setEditLrNumber(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', marginBottom: '4px' }}>LR Date</label>
                      <input type="date" value={editLrDate} onChange={e => setEditLrDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', marginBottom: '4px' }}>Notes / Instructions</label>
                    <input type="text" placeholder="e.g. Handle with care, Inter-state parcel" value={editDeliveryNotes} onChange={e => setEditDeliveryNotes(e.target.value)} />
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await api.put(`/orders/${viewOrder.id}/transport`, {
                          transport_name: editTransportName,
                          lr_number: editLrNumber,
                          lr_date: editLrDate,
                          delivery_address: editDeliveryAddress,
                          delivery_notes: editDeliveryNotes,
                          is_interstate: editIsInterstate
                        });
                        toast.success('Shipping & Transport details updated!');
                        const updated = { ...viewOrder, ...res.data.data };
                        setViewOrder(updated);
                        setEditingTransport(false);
                        fetchOrders();
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || 'Failed to update shipping details');
                      }
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', marginTop: '4px', fontSize: '13px' }}
                  >
                    Save Shipping & Transport Details
                  </button>
                </div>
              )}
            </div>

            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Items Purchased</h4>
            <div className="table-container" style={{ border: '1px solid var(--border-light)', margin: 0, padding: 0 }}>
              <table style={{ margin: 0 }}>
                <thead style={{ background: 'var(--bg-hover)' }}>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewOrder.order_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td data-label="Product" style={{ fontWeight: 500 }}>{item.product?.name || 'Unknown'}</td>
                      <td data-label="Qty" style={{ textAlign: 'center' }}>{item.qty}</td>
                      <td data-label="Price" style={{ textAlign: 'right' }}>₹{Number(item.price).toFixed(2)}</td>
                      <td data-label="Total" style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{(Number(item.qty) * Number(item.price) + Number(item.tax_amount || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', fontSize: '14px' }}>
              {Number(viewOrder.discount_amount) > 0 && (
                <div style={{ display: 'flex', width: '250px', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Discount:</span>
                  <span>- ₹{Number(viewOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}
              {Number(viewOrder.tax_amount) > 0 && (
                <div style={{ display: 'flex', width: '250px', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Total Tax:</span>
                  <span>+ ₹{Number(viewOrder.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', width: '250px', justifyContent: 'space-between', fontWeight: 600, fontSize: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '8px', marginTop: '4px' }}>
                <span>Grand Total:</span>
                <span style={{ color: 'var(--accent-blue)' }}>₹{Number(viewOrder.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', width: '250px', justifyContent: 'space-between', color: 'var(--success)' }}>
                <span>Amount Paid:</span>
                <span>₹{Number(viewOrder.amount_paid).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
