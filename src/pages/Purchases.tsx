import { useState, useEffect } from 'react';
import { Search, Trash2, CheckCircle2, Edit, Plus, Eye } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

export default function Purchases() {
  const { currentShop } = useAuth();

  const [activeTab, setActiveTab] = useState<'POs' | 'Invoices'>('POs');

  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showPOForm, setShowPOForm] = useState(false);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [poForm, setPoForm] = useState({ supplier_id: '', expected_date: '' });
  const [poItems, setPoItems] = useState<any[]>([]);

  const [receiveModal, setReceiveModal] = useState<any>(null); // holds the PO being received
  const [receiveForm, setReceiveForm] = useState<any>({ invoice_number: '', payment_amount: 0, payment_mode: 'Cash' });
  const [receiveItems, setReceiveItems] = useState<any[]>([]);

  // Pay Modal State
  const [payModal, setPayModal] = useState<any>(null);
  const [payForm, setPayForm] = useState<any>({ payment_amount: 0, payment_mode: 'Cash', reference_number: '' });

  const [viewModal, setViewModal] = useState<{ type: 'po' | 'invoice', data: any } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentShop) {
      fetchOrders();
      fetchInvoices();
      fetchSuppliers();
      fetchProducts();
    }
  }, [currentShop]);

  const fetchOrders = async () => {
    try {
      const res = await api.get(`/purchases/orders?shop_id=${currentShop.id}`);
      setOrders(res.data.data || []);
    } catch (error) { }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/purchases?shop_id=${currentShop.id}`);
      setInvoices(res.data.data || []);
    } catch (error) { toast.error('Failed to load purchases'); }
    finally { setLoading(false); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data.data || []);
    } catch (error) { }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get(`/products?shop_id=${currentShop.id}`);
      setProducts(res.data.data || []);
    } catch (error) { }
  };

  const [supplierPrices, setSupplierPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!poForm.supplier_id) {
      setSupplierPrices({});
      return;
    }
    api.get(`/suppliers/${poForm.supplier_id}/prices`).then(res => {
      const prices = res.data.data || {};
      setSupplierPrices(prices);
      setPoItems(prev => prev.map(item => {
        if (prices[item.product_id] !== undefined) {
          return { ...item, unit_price: prices[item.product_id], has_last_price: true };
        }
        return item;
      }));
    }).catch(() => {});
  }, [poForm.supplier_id]);

  // --- PO Creation Logic ---
  const handleAddPOItem = (product: any) => {
    if (poItems.find(i => i.product_id === product.id)) return toast.error('Product already added');
    const unitPrice = supplierPrices[product.id] !== undefined ? supplierPrices[product.id] : Number(product.price);
    setPoItems([...poItems, {
      product_id: product.id,
      name: product.name,
      qty_ordered: 1,
      unit_price: unitPrice,
      selling_price: Number(product.price),
      has_last_price: supplierPrices[product.id] !== undefined
    }]);
    setSearchQuery('');
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    const newItems = [...poItems];
    newItems[index][field] = value;
    setPoItems(newItems);
  };

  const calculatePOTotal = () => poItems.reduce((acc, item) => acc + (item.qty_ordered * item.unit_price), 0);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplier_id) return toast.error('Please select a supplier');
    if (poItems.length === 0) return toast.error('Add at least one product');
    if (poItems.some(i => !i.qty_ordered || Number(i.qty_ordered) <= 0)) return toast.error('Order quantity must be at least 1 for all items');
    if (poItems.some(i => i.unit_price === '' || Number(i.unit_price) < 0)) return toast.error('Unit price must be valid for all items');

    try {
      const payload = {
        shop_id: currentShop.id,
        supplier_id: poForm.supplier_id,
        expected_date: poForm.expected_date ? new Date(poForm.expected_date).toISOString() : undefined,
        items: poItems
      };

      if (editingPoId) {
        await api.put(`/purchases/orders/${editingPoId}`, payload);
        toast.success('Purchase Order updated!');
      } else {
        await api.post('/purchases/orders', payload);
        toast.success('Purchase Order created!');
      }

      setShowPOForm(false);
      setPoForm({ supplier_id: '', expected_date: '' });
      setPoItems([]);
      setEditingPoId(null);
      fetchOrders();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to submit PO'); }
  };

  const openEditPO = (order: any) => {
    setEditingPoId(order.id);
    setPoForm({
      supplier_id: order.supplier_id,
      expected_date: order.expected_date ? new Date(order.expected_date).toISOString().split('T')[0] : ''
    });
    setPoItems(order.items.map((i: any) => ({
      product_id: i.product_id,
      name: i.product.name,
      qty_ordered: i.qty_ordered,
      unit_price: Number(i.unit_price),
      selling_price: Number(i.product.price)
    })));
    setShowPOForm(true);
    setActiveTab('POs');
  };

  // --- Receive & QC Logic ---
  const openReceiveModal = (order: any) => {
    setReceiveModal(order);
    setReceiveForm({ invoice_number: '', payment_amount: 0, payment_mode: 'Cash' });
    setReceiveItems(order.items.map((i: any) => {
      const remaining = i.qty_ordered - i.qty_received;
      return {
        product_id: i.product_id,
        name: i.product.name,
        qty_ordered: i.qty_ordered,
        qty_received: remaining, // default to receiving the remaining balance
        qty_accepted: remaining,
        qty_rejected: 0,
        purchase_price: Number(i.unit_price),
        selling_price: Number(i.product.price)
      };
    }));
  };

  const updateReceiveItem = (index: number, field: string, value: any) => {
    const newItems = [...receiveItems];
    newItems[index][field] = value;
    if (field === 'qty_received' && value !== '') newItems[index].qty_accepted = Number(value) - Number(newItems[index].qty_rejected || 0);
    if (field === 'qty_rejected' && value !== '') newItems[index].qty_accepted = Number(newItems[index].qty_received || 0) - Number(value);
    setReceiveItems(newItems);
  };

  const calculateReceiveTotal = () => receiveItems.reduce((acc, item) => acc + (item.qty_accepted * item.purchase_price), 0);

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receiveItems.filter(i => Number(i.qty_received || 0) > 0).length === 0) return toast.error('Enter at least 1 received quantity');

    try {
      await api.post(`/purchases/orders/${receiveModal.id}/receive`, {
        invoice_number: receiveForm.invoice_number,
        total_amount: calculateReceiveTotal(),
        payment_amount: receiveForm.payment_amount,
        payment_mode: receiveForm.payment_mode,
        items: receiveItems
      });
      toast.success('Stock Received and QC Completed!');
      setReceiveModal(null);
      fetchOrders();
      fetchInvoices();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to receive'); }
  };

  const handlePayPO = async () => {
    if (!payModal) return;
    if (payForm.payment_amount <= 0) return toast.error('Enter a valid amount');
    try {
      await api.post(`/purchases/orders/${payModal.id}/pay`, payForm);
      toast.success('Payment recorded successfully');
      setPayModal(null);
      fetchOrders();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to record payment'); }
  };

  const handleUpdateMRP = async (productId: string, newMRP: number, isReceive: boolean = false) => {
    try {
      await api.put(`/products/${productId}`, { price: newMRP });
      toast.success('Selling Price Updated!');
      if (isReceive) {
        setReceiveItems(prev => prev.map(i => i.product_id === productId ? { ...i, selling_price: newMRP } : i));
      } else {
        setPoItems(prev => prev.map(i => i.product_id === productId ? { ...i, selling_price: newMRP } : i));
      }
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update MRP');
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode?.includes(searchQuery));

  return (
    <div>
      <header className="page-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Manage Purchase Orders and Goods Receipts</p>
        </div>
        {activeTab === 'POs' && !showPOForm && (
          <button className="btn btn-primary" onClick={() => {
            setEditingPoId(null);
            setPoForm({ supplier_id: '', expected_date: '' });
            setPoItems([]);
            setShowPOForm(true);
          }} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span className="desktop-only">New Purchase Order</span>
          </button>
        )}
      </header>

      <div className="custom-scrollbar" style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-light)', marginBottom: '24px', padding: '0 24px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button className={`tab ${activeTab === 'POs' ? 'active' : ''}`} onClick={() => { setActiveTab('POs'); setShowPOForm(false); setEditingPoId(null); setPoItems([]); }} style={{ padding: '12px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'POs' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'POs' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
          Purchase Orders
        </button>
        <button className={`tab ${activeTab === 'Invoices' ? 'active' : ''}`} onClick={() => { setActiveTab('Invoices'); setShowPOForm(false); setEditingPoId(null); setPoItems([]); }} style={{ padding: '12px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'Invoices' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'Invoices' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
          Purchase Invoices (History)
        </button>
      </div>

      {showPOForm && activeTab === 'POs' && (
        <Modal
          title={editingPoId ? 'Edit Purchase Order' : 'Create Purchase Order'}
          onClose={() => setShowPOForm(false)}
          width="800px"
          maxWidth="100%"
        >
          <div className="modal-body" style={{ padding: '24px' }}>
            <div className="flex-row gap-4" style={{ marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label>Supplier</label>
                <Select
                  options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                  value={poForm.supplier_id ? { value: poForm.supplier_id, label: suppliers.find(s => s.id === poForm.supplier_id)?.name } : null}
                  onChange={(opt: any) => setPoForm({ ...poForm, supplier_id: opt?.value })}
                  styles={selectStyles}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Expected Delivery Date (Optional)</label>
                <input type="date" value={poForm.expected_date} onChange={e => setPoForm({ ...poForm, expected_date: e.target.value })} />
              </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input
                  placeholder="Search products to order..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '40px', width: '100%' }}
                />
                {searchQuery && filteredProducts.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {filteredProducts.slice(0, 10).map(p => (
                      <div key={p.id} onClick={() => handleAddPOItem(p)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stock: {p.stock} | Price: ₹{p.price}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {poItems.length > 0 && (
                <div className="table-container" style={{ marginTop: '16px' }}>
                  <table style={{ background: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead style={{ background: 'var(--bg-main)' }}>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: '120px' }}>Order Qty</th>
                        <th style={{ width: '120px' }}>Unit Price (₹)</th>
                        <th style={{ width: '120px' }}>Total (₹)</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((item, idx) => (
                        <tr key={idx}>
                          <td data-label="Product">{item.name}</td>
                          <td data-label="Order Qty"><input type="number" min="1" value={item.qty_ordered} onChange={e => updatePOItem(idx, 'qty_ordered', e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '6px' }} /></td>
                          <td data-label="Unit Price (₹)">
                            <input type="number" step="0.01" value={item.unit_price} onChange={e => updatePOItem(idx, 'unit_price', e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '6px' }} />
                            {supplierPrices[item.product_id] !== undefined && (
                              <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px', fontWeight: 500 }}>
                                Last Paid: ₹{supplierPrices[item.product_id]}
                              </div>
                            )}
                            {item.selling_price !== undefined && Number(item.unit_price) >= Number(item.selling_price) && (
                              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--danger)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                                <span style={{ fontWeight: 600 }}>⚠️ Loss Alert (MRP: ₹{item.selling_price})</span>
                                {item.show_mrp_input ? (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input type="number" step="0.01" value={item.new_mrp || ''} onChange={e => updatePOItem(idx, 'new_mrp', e.target.value)} style={{ padding: '6px 8px', fontSize: '14px', width: '90px', borderRadius: '4px', border: '1px solid var(--border-light)' }} placeholder="New MRP" />
                                    <button type="button" onClick={() => {
                                      if (item.new_mrp && !isNaN(Number(item.new_mrp))) {
                                        handleUpdateMRP(item.product_id, Number(item.new_mrp), false);
                                        updatePOItem(idx, 'show_mrp_input', false);
                                      }
                                    }} style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Save</button>
                                    <button type="button" onClick={() => updatePOItem(idx, 'show_mrp_input', false)} style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Cancel</button>
                                  </div>
                                ) : (
                                  <button type="button" onClick={() => {
                                    updatePOItem(idx, 'new_mrp', Math.ceil(Number(item.unit_price) * 1.2));
                                    updatePOItem(idx, 'show_mrp_input', true);
                                  }} style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Fix MRP</button>
                                )}
                              </div>
                            )}
                          </td>
                          <td data-label="Total (₹)" style={{ fontWeight: 600 }}>{(Number(item.qty_ordered || 0) * Number(item.unit_price || 0)).toFixed(2)}</td>
                          <td data-label="Actions"><button type="button" onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total PO Value</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>₹{calculatePOTotal().toFixed(2)}</div>
              </div>
              <button onClick={handleCreatePO} className="btn btn-primary" style={{ height: '42px', padding: '0 32px' }}>{editingPoId ? 'Update PO' : 'Send PO'}</button>
            </div>
          </div>
        </Modal>
      )}

      {activeTab === 'POs' && (
        <div className="table-container">

          <table>
            <thead>
              <tr><th>Date</th><th>Supplier</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'right' }}>Total Amount</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (<tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No Purchase Orders found</td></tr>)
                : orders.map((o) => (
                  <tr key={o.id}>
                    <td data-label="Date">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td data-label="Supplier" style={{ fontWeight: 500 }}>{o.supplier?.name}</td>
                    <td data-label="Status" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: o.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: o.status === 'completed' ? 'var(--success)' : 'var(--warning)' }}>
                          {o.status === 'completed' ? 'QC COMPLETE' : o.status.toUpperCase()}
                        </span>
                        {Number(o.total_amount) > 0 && (
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: Number(o.amount_paid) >= Number(o.total_amount) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: Number(o.amount_paid) >= Number(o.total_amount) ? 'var(--success)' : 'var(--danger)' }}>
                            {Number(o.amount_paid) >= Number(o.total_amount) ? 'PAID' : (Number(o.amount_paid) > 0 ? 'PARTIAL PAY' : 'UNPAID')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Total Amount" style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(o.total_amount).toFixed(2)}</td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button title="View Details" onClick={() => setViewModal({ type: 'po', data: o })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', border: '1px solid var(--border-light)' }}>
                          <Eye size={14} />
                        </button>
                        {o.status !== 'completed' && (
                          <button onClick={() => openReceiveModal(o)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={14} /> Receive & QC
                          </button>
                        )}
                        {Number(o.amount_paid || 0) < Number(o.total_amount) && (
                          <button onClick={() => { setPayModal(o); setPayForm({ payment_amount: Math.max(0, Number(o.total_amount) - Number(o.amount_paid || 0)), payment_mode: 'Cash', reference_number: '' }); }} className="btn" style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--bg-hover)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                            Pay PO
                          </button>
                        )}
                        {(o.status === 'pending' || o.status === 'draft') && (
                          <button title="Edit PO" onClick={() => openEditPO(o)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                            <Edit size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Invoices' && (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Date</th><th>Invoice No</th><th>Supplier</th><th style={{ textAlign: 'right' }}>Total Amount</th><th style={{ textAlign: 'center' }}>Items Received</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (<tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>)
                : invoices.length === 0 ? (<tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>No invoices found</td></tr>)
                  : invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td data-label="Date">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td data-label="Invoice No">{inv.invoice_number || '-'}</td>
                      <td data-label="Supplier" style={{ fontWeight: 500 }}>{inv.supplier?.name}</td>
                      <td data-label="Total Amount" style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(inv.total_amount).toFixed(2)}</td>
                      <td data-label="Items Received" style={{ textAlign: 'center' }}>{inv.items?.length || 0}</td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <button title="View Details" onClick={() => setViewModal({ type: 'invoice', data: inv })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', border: '1px solid var(--border-light)' }}>
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {receiveModal && (
        <Modal
          title="Receive & QC Goods"
          onClose={() => setReceiveModal(null)}
          width="900px"
          maxWidth="100%"
        >
          <div className="modal-body" style={{ overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Supplier: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{receiveModal.supplier?.name}</span></p>
              <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PO Total</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>₹{Number(receiveModal.total_amount).toFixed(2)}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-light)' }}></div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Already Paid</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)' }}>₹{Number(receiveModal.amount_paid || 0).toFixed(2)}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-light)' }}></div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Balance Due</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--danger)' }}>₹{Math.max(0, Number(receiveModal.total_amount) - Number(receiveModal.amount_paid || 0)).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="flex-row gap-4" style={{ marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label>Supplier Invoice/Bill Number</label>
                <input value={receiveForm.invoice_number} onChange={e => setReceiveForm({ ...receiveForm, invoice_number: e.target.value })} placeholder="Bill no from supplier..." />
              </div>
              <div style={{ flex: 1 }}></div>
            </div>

            <div className="table-container" style={{ marginBottom: '24px' }}>
              <table style={{ width: '100%', background: 'var(--bg-main)', borderRadius: '8px' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Product</th>
                    <th style={{ padding: '12px', width: '80px' }}>Ordered</th>
                    <th style={{ padding: '12px', width: '100px' }}>Qty Rcvd</th>
                    <th style={{ padding: '12px', width: '100px' }}>QC Pass</th>
                    <th style={{ padding: '12px', width: '100px' }}>QC Fail</th>
                    <th style={{ padding: '12px', width: '120px' }}>Price (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveItems.map((item, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td data-label="Product" style={{ padding: '12px' }}>{item.name}</td>
                      <td data-label="Ordered" style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{item.qty_ordered}</td>
                      <td data-label="Qty Rcvd" style={{ padding: '8px' }}><input type="number" min="0" value={item.qty_received} onChange={e => updateReceiveItem(idx, 'qty_received', e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '6px' }} /></td>
                      <td data-label="QC Pass" style={{ padding: '8px' }}><input type="number" min="0" max={item.qty_received} value={item.qty_accepted} disabled style={{ padding: '6px', background: 'rgba(0,0,0,0.1)' }} /></td>
                      <td data-label="QC Fail" style={{ padding: '8px' }}><input type="number" min="0" max={item.qty_received} value={item.qty_rejected} onChange={e => updateReceiveItem(idx, 'qty_rejected', e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '6px' }} /></td>
                      <td data-label="Price (₹)" style={{ padding: '8px' }}>
                        <input type="number" step="0.01" value={item.purchase_price} onChange={e => updateReceiveItem(idx, 'purchase_price', e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '6px' }} />
                        {item.selling_price !== undefined && Number(item.purchase_price) >= Number(item.selling_price) && (
                          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--danger)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 600 }}>⚠️ Loss Alert (MRP: ₹{item.selling_price})</span>
                            {item.show_mrp_input ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input type="number" step="0.01" value={item.new_mrp || ''} onChange={e => updateReceiveItem(idx, 'new_mrp', e.target.value)} style={{ padding: '6px 8px', fontSize: '14px', width: '90px', borderRadius: '4px', border: '1px solid var(--border-light)' }} placeholder="New MRP" />
                                <button type="button" onClick={() => {
                                  if (item.new_mrp && !isNaN(Number(item.new_mrp))) {
                                    handleUpdateMRP(item.product_id, Number(item.new_mrp), true);
                                    updateReceiveItem(idx, 'show_mrp_input', false);
                                  }
                                }} style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Save</button>
                                <button type="button" onClick={() => updateReceiveItem(idx, 'show_mrp_input', false)} style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Cancel</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => {
                                updateReceiveItem(idx, 'new_mrp', Math.ceil(Number(item.purchase_price) * 1.2));
                                updateReceiveItem(idx, 'show_mrp_input', true);
                              }} style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Fix MRP</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '24px', background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Invoice Value</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>₹{calculateReceiveTotal().toFixed(2)}</div>
              </div>
              <button onClick={handleReceiveSubmit} className="btn btn-primary" style={{ height: '42px', padding: '0 32px' }}>Confirm Receipt</button>
            </div>

          </div>
        </Modal>
      )}

      {payModal && (
        <Modal title="Make Payment" onClose={() => setPayModal(null)} width="400px">
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px', background: 'var(--bg-main)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>PO Total</span>
                <span style={{ fontWeight: 500 }}>₹{Number(payModal.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Already Paid</span>
                <span style={{ fontWeight: 500, color: 'var(--success)' }}>₹{Number(payModal.amount_paid || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '8px', marginTop: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Balance Due</span>
                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>₹{Math.max(0, Number(payModal.total_amount) - Number(payModal.amount_paid || 0)).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Payment Amount (₹)</label>
              <input type="number" step="0.01" autoComplete="off" name="pay_amt" value={payForm.payment_amount} onChange={e => setPayForm({ ...payForm, payment_amount: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label>Payment Mode</label>
              <Select
                options={[{ value: 'Cash', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'Bank Transfer', label: 'Bank Transfer' }]}
                value={{ value: payForm.payment_mode, label: payForm.payment_mode }}
                onChange={(opt: any) => setPayForm({ ...payForm, payment_mode: opt.value })}
                styles={{ ...selectStyles, menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label>Reference Number (Optional)</label>
              <input value={payForm.reference_number} onChange={e => setPayForm({ ...payForm, reference_number: e.target.value })} placeholder="Transaction ID, Cheque No..." />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn" onClick={() => setPayModal(null)} style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border-light)' }}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePayPO} style={{ flex: 1 }}>Confirm Payment</button>
            </div>
          </div>
        </Modal>
      )}
      {viewModal && (
        <Modal title={viewModal.type === 'po' ? "Purchase Order Details" : "Invoice Details"} onClose={() => setViewModal(null)} width="700px">
          <div className="modal-body" style={{ padding: '0 0 20px 0' }}>
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Supplier</p>
                <p style={{ fontWeight: 600 }}>{viewModal.data.supplier?.name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date</p>
                <p style={{ fontWeight: 600 }}>{new Date(viewModal.data.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="table-container" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-light)' }}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    {viewModal.type === 'po' ? (
                      <>
                        <th style={{ textAlign: 'center' }}>Ordered</th>
                        <th style={{ textAlign: 'center' }}>Fulfilled</th>
                        <th style={{ textAlign: 'center' }}>QC Fail</th>
                      </>
                    ) : (
                      <>
                        <th style={{ textAlign: 'center' }}>Rcvd</th>
                        <th style={{ textAlign: 'center' }}>QC Pass</th>
                        <th style={{ textAlign: 'center' }}>QC Fail</th>
                      </>
                    )}
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewModal.data.items || []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td data-label="Product" style={{ fontWeight: 500 }}>{item.product?.name || 'Unknown'}</td>
                      {viewModal.type === 'po' ? (
                        <>
                          <td data-label="Ordered" style={{ textAlign: 'center' }}>{item.qty_ordered}</td>
                          <td data-label="Fulfilled" style={{ textAlign: 'center', color: 'var(--success)' }}>{item.qty_received}</td>
                          <td data-label="QC Fail" style={{ textAlign: 'center', color: Number(item.qty_rejected) > 0 ? 'var(--danger)' : 'inherit' }}>{item.qty_rejected || 0}</td>
                        </>
                      ) : (
                        <>
                          <td data-label="Rcvd" style={{ textAlign: 'center' }}>{item.qty_received}</td>
                          <td data-label="QC Pass" style={{ textAlign: 'center', color: 'var(--success)' }}>{item.qty_accepted}</td>
                          <td data-label="QC Fail" style={{ textAlign: 'center', color: Number(item.qty_rejected) > 0 ? 'var(--danger)' : 'inherit' }}>{item.qty_rejected}</td>
                        </>
                      )}
                      <td data-label="Unit Price" style={{ textAlign: 'right' }}>₹{Number(viewModal.type === 'po' ? item.unit_price : item.purchase_price).toFixed(2)}</td>
                      <td data-label="Total" style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{(Number(viewModal.type === 'po' ? (item.qty_ordered - (item.qty_rejected || 0)) : item.qty_accepted) * Number(viewModal.type === 'po' ? item.unit_price : item.purchase_price)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '250px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Amount</span>
                  <span style={{ fontWeight: 700, fontSize: '16px' }}>₹{Number(viewModal.data.total_amount).toFixed(2)}</span>
                </div>
                {viewModal.type === 'po' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Amount Paid</span>
                      <span style={{ fontWeight: 600, color: 'var(--success)' }}>₹{Number(viewModal.data.amount_paid || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed var(--border-light)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Balance Due</span>
                      <span style={{ fontWeight: 600, color: 'var(--danger)' }}>₹{Math.max(0, Number(viewModal.data.total_amount) - Number(viewModal.data.amount_paid || 0)).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
