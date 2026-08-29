import { useState, useEffect } from 'react';
import { ShoppingBag, Search, Trash2, CheckCircle2, FileText } from 'lucide-react';
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
  const [poForm, setPoForm] = useState({ supplier_id: '', expected_date: '' });
  const [poItems, setPoItems] = useState<any[]>([]);
  
  const [receiveModal, setReceiveModal] = useState<any>(null); // holds the PO being received
  const [receiveForm, setReceiveForm] = useState({ invoice_number: '', payment_amount: 0, payment_mode: 'Cash' });
  const [receiveItems, setReceiveItems] = useState<any[]>([]);
  
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
    } catch (error) {}
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
    } catch (error) {}
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get(`/products?shop_id=${currentShop.id}`);
      setProducts(res.data.data || []);
    } catch (error) {}
  };

  // --- PO Creation Logic ---
  const handleAddPOItem = (product: any) => {
    if (poItems.find(i => i.product_id === product.id)) return toast.error('Product already added');
    setPoItems([...poItems, {
      product_id: product.id,
      name: product.name,
      qty_ordered: 1,
      unit_price: Number(product.price) 
    }]);
    setSearchQuery('');
  };

  const updatePOItem = (index: number, field: string, value: number) => {
    const newItems = [...poItems];
    newItems[index][field] = value;
    setPoItems(newItems);
  };

  const calculatePOTotal = () => poItems.reduce((acc, item) => acc + (item.qty_ordered * item.unit_price), 0);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplier_id) return toast.error('Please select a supplier');
    if (poItems.length === 0) return toast.error('Add at least one product');

    try {
      await api.post('/purchases/orders', {
        shop_id: currentShop.id,
        supplier_id: poForm.supplier_id,
        expected_date: poForm.expected_date ? new Date(poForm.expected_date).toISOString() : undefined,
        items: poItems
      });
      toast.success('Purchase Order created!');
      setShowPOForm(false);
      setPoForm({ supplier_id: '', expected_date: '' });
      setPoItems([]);
      fetchOrders();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to submit PO'); }
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
        purchase_price: Number(i.unit_price)
      };
    }));
  };

  const updateReceiveItem = (index: number, field: string, value: number) => {
    const newItems = [...receiveItems];
    newItems[index][field] = value;
    if (field === 'qty_received') newItems[index].qty_accepted = value - newItems[index].qty_rejected;
    if (field === 'qty_rejected') newItems[index].qty_accepted = newItems[index].qty_received - value;
    setReceiveItems(newItems);
  };

  const calculateReceiveTotal = () => receiveItems.reduce((acc, item) => acc + (item.qty_received * item.purchase_price), 0);

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receiveItems.filter(i => i.qty_received > 0).length === 0) return toast.error('Enter at least 1 received quantity');

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

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode?.includes(searchQuery));

  return (
    <div>
      <header className="page-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Manage Purchase Orders and Goods Receipts</p>
        </div>
        {activeTab === 'POs' && <button className="btn btn-primary" onClick={() => setShowPOForm(!showPOForm)}>{showPOForm ? 'Cancel' : 'New Purchase Order'}</button>}
      </header>
      
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-light)', marginBottom: '24px', padding: '0 24px' }}>
        <button className={`tab ${activeTab === 'POs' ? 'active' : ''}`} onClick={() => {setActiveTab('POs'); setShowPOForm(false);}} style={{ padding: '12px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'POs' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'POs' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
          Purchase Orders
        </button>
        <button className={`tab ${activeTab === 'Invoices' ? 'active' : ''}`} onClick={() => {setActiveTab('Invoices'); setShowPOForm(false);}} style={{ padding: '12px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'Invoices' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'Invoices' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
          Purchase Invoices (History)
        </button>
      </div>
      
      {showPOForm && activeTab === 'POs' && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Create Purchase Order</h3>
          <div className="flex-row gap-4" style={{ marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label>Supplier</label>
              <Select
                options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                onChange={(opt: any) => setPoForm({...poForm, supplier_id: opt?.value})}
                styles={selectStyles}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Expected Delivery Date (Optional)</label>
              <input type="date" value={poForm.expected_date} onChange={e => setPoForm({...poForm, expected_date: e.target.value})} />
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
                      <td>{item.name}</td>
                      <td><input type="number" min="1" value={item.qty_ordered} onChange={e => updatePOItem(idx, 'qty_ordered', Number(e.target.value))} style={{ padding: '6px' }} /></td>
                      <td><input type="number" step="0.01" value={item.unit_price} onChange={e => updatePOItem(idx, 'unit_price', Number(e.target.value))} style={{ padding: '6px' }} /></td>
                      <td style={{ fontWeight: 600 }}>{(item.qty_ordered * item.unit_price).toFixed(2)}</td>
                      <td><button onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total PO Value</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>₹{calculatePOTotal().toFixed(2)}</div>
            </div>
            <button onClick={handleCreatePO} className="btn btn-primary" style={{ height: '42px', padding: '0 32px' }}>Send PO</button>
          </div>
        </div>
      )}

      {activeTab === 'POs' && (
        <div className="table-container">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} color="var(--text-secondary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Purchase Orders</h2>
          </div>
          <table>
            <thead>
              <tr><th>Date</th><th>Supplier</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'right' }}>Total Amount</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (<tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No Purchase Orders found</td></tr>) 
              : orders.map((o) => (
                <tr key={o.id}>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 500 }}>{o.supplier?.name}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: o.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: o.status === 'completed' ? 'var(--success)' : 'var(--warning)' }}>
                      {o.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(o.total_amount).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {o.status !== 'completed' && (
                      <button onClick={() => openReceiveModal(o)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} /> Receive & QC
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Invoices' && (
        <div className="table-container">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--text-secondary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Purchase Invoices (History)</h2>
          </div>
          <table>
            <thead>
              <tr><th>Date</th><th>Invoice No</th><th>Supplier</th><th style={{ textAlign: 'right' }}>Total Amount</th><th style={{ textAlign: 'center' }}>Items Received</th></tr>
            </thead>
            <tbody>
              {loading ? (<tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>) 
              : invoices.length === 0 ? (<tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No invoices found</td></tr>) 
              : invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td>{inv.invoice_number || '-'}</td>
                  <td style={{ fontWeight: 500 }}>{inv.supplier?.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(inv.total_amount).toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{inv.items?.length || 0}</td>
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
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '-12px', marginBottom: '16px' }}>Supplier: {receiveModal.supplier?.name}</p>
              <div className="flex-row gap-4" style={{ marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <label>Supplier Invoice/Bill Number</label>
                  <input value={receiveForm.invoice_number} onChange={e => setReceiveForm({...receiveForm, invoice_number: e.target.value})} placeholder="Bill no from supplier..." />
                </div>
                <div style={{ flex: 1 }}></div>
              </div>

              <table style={{ width: '100%', marginBottom: '24px', background: 'var(--bg-main)', borderRadius: '8px' }}>
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
                      <td style={{ padding: '12px' }}>{item.name}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{item.qty_ordered}</td>
                      <td style={{ padding: '8px' }}><input type="number" min="0" value={item.qty_received} onChange={e => updateReceiveItem(idx, 'qty_received', Number(e.target.value))} style={{ padding: '6px' }} /></td>
                      <td style={{ padding: '8px' }}><input type="number" min="0" max={item.qty_received} value={item.qty_accepted} disabled style={{ padding: '6px', background: 'rgba(0,0,0,0.1)' }} /></td>
                      <td style={{ padding: '8px' }}><input type="number" min="0" max={item.qty_received} value={item.qty_rejected} onChange={e => updateReceiveItem(idx, 'qty_rejected', Number(e.target.value))} style={{ padding: '6px' }} /></td>
                      <td style={{ padding: '8px' }}><input type="number" step="0.01" value={item.purchase_price} onChange={e => updateReceiveItem(idx, 'purchase_price', Number(e.target.value))} style={{ padding: '6px' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '24px', background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ width: '200px' }}>
                  <label>Amount Paid Now (₹)</label>
                  <input type="number" step="0.01" value={receiveForm.payment_amount} onChange={e => setReceiveForm({...receiveForm, payment_amount: Number(e.target.value)})} />
                </div>
                <div style={{ width: '150px' }}>
                  <label>Paid Via</label>
                  <Select
                    options={[{value: 'Cash', label: 'Cash'}, {value: 'UPI', label: 'UPI'}, {value: 'Bank', label: 'Bank Transfer'}]}
                    value={{value: receiveForm.payment_mode, label: receiveForm.payment_mode}}
                    onChange={(opt: any) => setReceiveForm({...receiveForm, payment_mode: opt?.value})}
                    styles={selectStyles}
                    menuPosition="fixed"
                  />
                </div>
                <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Invoice Value</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>₹{calculateReceiveTotal().toFixed(2)}</div>
                </div>
                <button onClick={handleReceiveSubmit} className="btn btn-primary" style={{ height: '42px', padding: '0 32px' }}>Confirm Receipt</button>
              </div>

            </div>
        </Modal>
      )}

    </div>
  );
}
