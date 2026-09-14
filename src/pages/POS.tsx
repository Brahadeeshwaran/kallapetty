import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import CreatableSelect from 'react-select/creatable';
import { selectStyles } from '../lib/utils';
import Modal from '../components/Modal';

export default function POS() {
  const { currentShop } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState('');
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [requireCustomerModal, setRequireCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Delivery & Transport Details
  const [orderType, setOrderType] = useState('pos');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [useCustomerAddress, setUseCustomerAddress] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [transportName, setTransportName] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [lrDate, setLrDate] = useState('');
  const [isInterstate, setIsInterstate] = useState(false);
  const [showTransport, setShowTransport] = useState(false);
  const [payLater, setPayLater] = useState(false);
  const [printCopyType, setPrintCopyType] = useState('Original');
  const [customPrintCopy, setCustomPrintCopy] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [defaultInvoiceNumber, setDefaultInvoiceNumber] = useState('');

  const [customerPrices, setCustomerPrices] = useState<Record<string, number>>({});

  const [posColumns, setPosColumns] = useState<any[]>([]);

  useEffect(() => {
    if (!currentShop) return;
    api.get('/customers').then(res => {
      setCustomers(res.data.data);
    }).catch(() => toast.error('Failed to load customers'));

    api.get(`/products?shop_id=${currentShop.id}`).then(res => {
      setProducts(res.data.data);
    }).catch(() => toast.error('Failed to load products'));

    api.get('/shops').then(res => {
      const shop = res.data.data?.find((s: any) => s.id === currentShop.id);
      if (shop) {
        if (shop.custom_column_definitions) {
          setPosColumns(shop.custom_column_definitions.filter((c: any) => c.scope === 'pos'));
        }
        const prefix = shop.invoice_prefix || '';
        const suffix = shop.invoice_suffix || '';
        const num = shop.next_invoice_number || 1;
        const padding = shop.invoice_padding || 1;
        const formatted = `${prefix}${String(num).padStart(padding, '0')}${suffix}`;
        setDefaultInvoiceNumber(formatted);
        setInvoiceNumber(formatted);
      }
    }).catch(() => {});
  }, [currentShop]);

  useEffect(() => {
    if (useCustomerAddress && selectedCustomer) {
      const cust = customers.find(c => c.id === selectedCustomer);
      if (cust?.address) {
        setDeliveryAddress(cust.address);
      } else {
        toast.error('Selected customer has no saved address');
        setUseCustomerAddress(false);
      }
    }
  }, [selectedCustomer, useCustomerAddress, customers]);

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerPrices({});
      return;
    }
    api.get(`/customers/${selectedCustomer}/prices`).then(res => {
      const prices = res.data.data || {};
      setCustomerPrices(prices);
      // Auto update unit prices for products currently in cart
      setCart(prev => prev.map(item => {
        if (prices[item.id] !== undefined) {
          return { ...item, price: prices[item.id] };
        }
        return item;
      }));
    }).catch(() => {});
  }, [selectedCustomer]);

  const addToCart = (product: any) => {
    if (product.stock <= 0 && !product.is_service) return toast.error('Out of stock!');
    const initialPrice = customerPrices[product.id] !== undefined ? customerPrices[product.id] : product.price;
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        if (!product.is_service && existing.qty >= product.stock) { toast.error('Max stock reached'); return prev; }
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...product, price: initialPrice, qty: 1 }];
    });
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;

    // Check exact barcode first
    const exactBarcode = products.find(p => p.barcode === barcode && p.shop_id === currentShop.id);
    if (exactBarcode) {
      addToCart(exactBarcode);
      setBarcode('');
      return;
    }

    // Check filtered name or partial barcode (if exactly one result)
    const filtered = products.filter(p =>
      p.shop_id === currentShop.id &&
      (p.name.toLowerCase().includes(barcode.toLowerCase()) || (p.barcode && String(p.barcode).includes(barcode)))
    );

    if (filtered.length === 1) {
      addToCart(filtered[0]);
      setBarcode('');
      return;
    } else if (filtered.length > 1) {
      // Don't show error, just let the user pick from the filtered list
      return;
    }

    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(barcode)}?shop_id=${currentShop.id}`);
      const product = res.data.data;
      if (!product) return toast.error('Product not found!');
      addToCart(product);
      setBarcode('');
    } catch (error) { toast.error('Failed to find product'); }
  };

  // Calculate Subtotal (price without tax if flat/exclusive, or extract if inclusive)
  // For simplicity, assuming price entered in DB is the base price and flat tax is added on top. 
  // If gst, it's also added on top.
  let subtotal = 0;
  let totalTax = 0;

  cart.forEach(item => {
    const itemBasePrice = parseFloat(item.price);
    const itemQty = item.qty;
    const itemTaxRate = parseFloat(item.tax_rate) || 0;

    const itemTotalBase = itemBasePrice * itemQty;
    const itemTotalTax = itemTotalBase * (itemTaxRate / 100);

    subtotal += itemTotalBase;
    totalTax += itemTotalTax;
  });

  const total = subtotal + totalTax;
  const finalTotal = total - (parseFloat(discount) || 0);

  useEffect(() => {
    if (!payLater) {
      setAmountPaid(finalTotal.toFixed(2));
    }
  }, [finalTotal, payLater]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop) return toast.error('No active shop context');

    const paidAmt = parseFloat(amountPaid) || 0;
    if (cart.some(item => !item.qty || Number(item.qty) <= 0)) return toast.error('Quantity must be at least 1 for all items');

    if (paidAmt < finalTotal && !selectedCustomer) {
      toast.error('Partial payment requires you to select a Customer from the dropdown.');
      return;
    }
    if (orderType === 'delivery' && !selectedCustomer) {
      toast.error('Delivery orders require a Customer.');
      return;
    }

    setLoading(true);
    try {
      let status = 'unpaid';
      if (paidAmt >= finalTotal) status = 'paid';
      else if (paidAmt > 0) status = 'partial';

      const res = await api.post('/orders', {
        shop_id: currentShop.id,
        customer_id: selectedCustomer || undefined,
        total_amount: total,
        tax_amount: totalTax,
        discount_amount: parseFloat(discount) || 0,
        amount_paid: paidAmt,
        status: status,
        order_type: orderType,
        expected_delivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : undefined,
        delivery_address: deliveryAddress || undefined,
        delivery_notes: deliveryNotes || undefined,
        transport_name: transportName || undefined,
        lr_number: lrNumber || undefined,
        lr_date: lrDate || undefined,
        is_interstate: isInterstate,
        invoice_number: invoiceNumber !== defaultInvoiceNumber ? invoiceNumber : undefined,
        items: cart.map(item => ({
          product_id: item.id,
          qty: item.qty,
          price: parseFloat(item.price),
          tax_amount: (parseFloat(item.price) * item.qty) * ((parseFloat(item.tax_rate) || 0) / 100),
          unit: item.unit || 'Pcs',
          custom_inputs: item.custom_inputs || {}
        }))
      });
      toast.success('Bill Created!');
      setLastOrder(res.data.data);
      setCart([]); setAmountPaid(''); setDiscount(''); setPayLater(false);
      setSelectedCustomer(''); setOrderType('pos'); setExpectedDelivery(''); setDeliveryAddress(''); setDeliveryNotes(''); setUseCustomerAddress(false);
      setTransportName(''); setLrNumber(''); setLrDate(''); setIsInterstate(false); setShowTransport(false);
      setPrintCopyType('Original'); setCustomPrintCopy('');
      setIsMobileCartOpen(false);
      // Refresh shop invoice number for next bill
      api.get('/shops').then(r => {
        const shop = r.data.data?.find((s: any) => s.id === currentShop.id);
        if (shop) {
          const prefix = shop.invoice_prefix || '';
          const suffix = shop.invoice_suffix || '';
          const num = shop.next_invoice_number || 1;
          const padding = shop.invoice_padding || 1;
          const formatted = `${prefix}${String(num).padStart(padding, '0')}${suffix}`;
          setDefaultInvoiceNumber(formatted);
          setInvoiceNumber(formatted);
        }
      }).catch(() => {});
    } catch (error: any) {
      console.error("CHECKOUT_ERROR:", error);
      toast.error(error.response?.data?.message || `Checkout failed: ${error.message || error}`);
    }
    finally { setLoading(false); }
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName) return toast.error('Name is required');
    setLoading(true);
    try {
      const res = await api.post('/customers', {
        name: newCustomerName,
        phone: newCustomerPhone
      });
      const newCustomer = res.data.data;
      setCustomers(prev => [...prev, newCustomer]);
      setSelectedCustomer(newCustomer.id);
      setRequireCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      toast.success('Customer added! Please confirm the bill now.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header className="page-header">
        <div><h1 className="page-title">Point of Sale</h1><p className="page-subtitle">Scan products and generate bills</p></div>
      </header>

      <div className="pos-layout">
        <div className="pos-left">
          <div className="card flex-row gap-4">
            <form className="pos-search-form" onSubmit={handleBarcodeSubmit} style={{ flex: 1, display: 'flex', gap: '16px', position: 'relative' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-secondary)' }} />
                <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Search product or scan barcode..." autoFocus style={{ paddingLeft: '44px' }} />
              </div>
              <button type="submit" className="btn btn-secondary">Scan</button>
            </form>
          </div>

          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'visible', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Available Products</h3>
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', alignContent: 'start', paddingBottom: '32px', paddingTop: '40px', marginTop: '-36px' }} className="custom-scrollbar pos-products-grid">
              {products.filter(p => p.shop_id === currentShop.id && (p.name.toLowerCase().includes(barcode.toLowerCase()) || (p.barcode && p.barcode.includes(barcode)))).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => addToCart(p)} 
                  className="product-card pos-card-tooltip" 
                  style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px', minHeight: '110px', position: 'relative' }}
                >
                  <div className="sidebar-style-tooltip">
                    {p.name}
                  </div>
                  <div>
                    <div 
                      style={{ fontWeight: 500, fontSize: '13px', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '34px' }}
                    >
                      {p.name}
                    </div>
                    {p.category && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.category}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>₹{parseFloat(p.price).toFixed(2)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75px' }}>{p.barcode || 'No Barcode'}</span>
                      <span style={{ color: p.stock <= 5 ? 'var(--danger)' : 'var(--success)', fontWeight: 500, background: p.stock <= 5 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                        {p.stock} left
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {products.filter(p => p.shop_id === currentShop.id).length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', gridColumn: '1 / -1' }}>No products available in this store.</p>}
            </div>
          </div>
        </div>

        <div className={`pos-right ${isMobileCartOpen ? 'mobile-open' : ''}`}>
          <div className="mobile-cart-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={18} /> Cart ({cart.length})</h2>
            <button onClick={() => setIsMobileCartOpen(false)} style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex' }}><X size={20} /></button>
          </div>

          <div className="desktop-cart-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={16} /> Cart</h2>
            <span style={{ fontSize: '12px', background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px' }}>{cart.length} Items</span>
          </div>

          <div className="pos-cart-items custom-scrollbar">
            {cart.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', fontSize: '14px' }}>Cart is empty</p>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="pos-cart-item">
                  <div className="flex-row space-between" style={{ fontWeight: 500, fontSize: '14px' }}>
                    <span>{item.name}</span>
                    <span>₹{(parseFloat(item.price) * item.qty).toFixed(2)}</span>
                  </div>
                  <div className="flex-row space-between items-center">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCart(c => c.map((p, i) => i === idx ? { ...p, price: val } : p));
                        }}
                        style={{ width: '68px', fontSize: '13px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-app)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', outline: 'none', fontWeight: 500 }}
                        title="Edit unit price"
                      />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>/ {item.unit || 'Pcs'}</span>
                      {customerPrices[item.id] !== undefined && (
                        <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex-row items-center gap-2" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '4px' }}>
                      <button onClick={() => setCart(c => c.map((p, i) => i === idx ? { ...p, qty: Math.max(1, p.qty - 1) } : p))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}><Minus size={14} color="var(--text-secondary)" /></button>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => {
                          if (e.target.value === '') {
                            setCart(c => c.map((p, i) => i === idx ? { ...p, qty: '' } : p));
                            return;
                          }
                          const val = parseInt(e.target.value, 10);
                          if (isNaN(val) || val < 0) return;
                          if (!item.is_service && val > item.stock) {
                            toast.error(`Only ${item.stock} left in stock!`);
                            return;
                          }
                          setCart(c => c.map((p, i) => i === idx ? { ...p, qty: val } : p));
                        }}
                        className="qty-input"
                        style={{ width: '48px', textAlign: 'center', fontSize: '13px', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
                      />
                      <button onClick={() => setCart(c => c.map((p, i) => {
                        if (i === idx) {
                          if (!p.is_service && Number(p.qty || 0) + 1 > p.stock) { toast.error('Max stock reached'); return p; }
                          return { ...p, qty: Number(p.qty || 0) + 1 };
                        }
                        return p;
                      }))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}><Plus size={14} color="var(--text-secondary)" /></button>
                    </div>
                    <button onClick={() => setCart(c => c.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}><Trash2 size={16} color="var(--danger)" /></button>
                  </div>

                  {posColumns.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(posColumns.length, 2)}, 1fr)`, gap: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border-light)' }}>
                      {posColumns.map((col: any) => (
                        <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{col.name}</label>
                          <input
                            type="text"
                            placeholder={`Enter ${col.name}`}
                            value={item.custom_inputs?.[col.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(c => c.map((p, i) => i === idx ? {
                                ...p,
                                custom_inputs: { ...(p.custom_inputs || {}), [col.id]: val }
                              } : p));
                            }}
                            style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-app)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pos-footer">
            <div className="flex-row space-between items-center">
              <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)' }}>Total</span>
              <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>₹{total.toFixed(2)}</span>
            </div>
            <button className="btn btn-primary" disabled={cart.length === 0} onClick={() => { setCheckoutModal(true); setIsMobileCartOpen(false); }} style={{ padding: '14px', width: '100%', fontSize: '15px' }}>Checkout</button>
          </div>
        </div>

        {/* Mobile Floating Cart Toggle */}
        <div className="mobile-cart-toggle" onClick={() => setIsMobileCartOpen(true)}>
          <div className="flex-row items-center gap-3">
            <div style={{ position: 'relative' }}>
              <ShoppingCart size={22} color="var(--bg-app)" />
              {cart.length > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cart.length}</span>}
            </div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--bg-app)' }}>₹{total.toFixed(2)}</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--bg-app)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View Cart
          </div>
        </div>
      </div>

      {checkoutModal && (
        <Modal
          title={lastOrder ? 'Bill Summary' : 'Finalize Checkout'}
          onClose={() => { setCheckoutModal(false); setLastOrder(null); }}
          width="480px"
        >
          {lastOrder ? (
            <div className="modal-body" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', textAlign: 'center', color: 'var(--success)' }}>Bill Created Successfully!</h3>
              <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ margin: 0, fontWeight: 500, whiteSpace: 'nowrap', fontSize: '14px' }}>Copy Type:</label>
                <select
                  value={printCopyType}
                  onChange={e => setPrintCopyType(e.target.value)}
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '14px' }}
                >
                  <option value="Original">Original</option>
                  <option value="Duplicate">Duplicate</option>
                  <option value="Transport">Transport</option>
                  <option value="Custom">Custom...</option>
                </select>
                {printCopyType === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Enter label"
                    value={customPrintCopy}
                    onChange={e => setCustomPrintCopy(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '14px' }}
                  />
                )}
              </div>
              <iframe id="invoice-frame" src={`/print/${lastOrder.id}?preview=true&label=${encodeURIComponent(printCopyType === 'Custom' ? customPrintCopy : printCopyType)}`} style={{ width: '100%', height: '450px', border: '1px solid var(--border-light)', borderRadius: '8px', background: '#fff' }} title="Invoice Preview" />
              <div className="flex-row gap-4" style={{ marginTop: '16px' }}>
                <button onClick={() => {
                  const iframe = document.getElementById('invoice-frame') as HTMLIFrameElement;
                  if (iframe && iframe.contentWindow) iframe.contentWindow.print();
                }} className="btn btn-primary" style={{ flex: 1, padding: '14px', justifyContent: 'center' }}>
                  Print Invoice
                </button>
                <button onClick={() => { setCheckoutModal(false); setLastOrder(null); }} className="btn btn-secondary" style={{ flex: 1, padding: '14px', justifyContent: 'center' }}>
                  New Bill
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="modal-body">
              <div style={{ display: 'flex', background: 'var(--bg-hover)', borderRadius: '8px', padding: '4px', marginBottom: '16px' }}>
                <button type="button" onClick={() => setOrderType('pos')} className={`btn ${orderType === 'pos' ? 'btn-primary' : ''}`} style={{ flex: 1, border: 'none', background: orderType === 'pos' ? '' : 'transparent', color: orderType === 'pos' ? 'var(--btn-primary-text)' : 'var(--text-secondary)' }}>Direct / Walk-in</button>
                <button type="button" onClick={() => setOrderType('delivery')} className={`btn ${orderType === 'delivery' ? 'btn-primary' : ''}`} style={{ flex: 1, border: 'none', background: orderType === 'delivery' ? '' : 'transparent', color: orderType === 'delivery' ? 'var(--btn-primary-text)' : 'var(--text-secondary)' }}>For Delivery</button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Invoice / Bill No.</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="Auto-generated Bill No."
                  style={{ fontWeight: 600, color: 'var(--accent-blue)', background: 'var(--bg-app)' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Bill To (Customer)</label>
                <CreatableSelect
                  options={[{ value: '', label: 'Walk-in Customer' }, ...customers.map(c => ({ value: c.id, label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))]}
                  value={selectedCustomer ? { value: selectedCustomer, label: customers.find(c => c.id === selectedCustomer)?.name || 'Walk-in Customer' } : { value: '', label: 'Walk-in Customer' }}
                  onChange={(opt: any) => setSelectedCustomer(opt?.value || '')}
                  onCreateOption={async (inputValue) => {
                    try {
                      setLoading(true);
                      const res = await api.post('/customers', { name: inputValue, phone: '' });
                      setCustomers(prev => [...prev, res.data.data]);
                      setSelectedCustomer(res.data.data.id);
                      toast.success('Customer created!');
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || 'Failed to create customer');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  placeholder="Search or type to create new..."
                  formatCreateLabel={(inputValue) => `Add "${inputValue}" as new customer`}
                  styles={{ ...selectStyles, menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isDisabled={loading}
                />
              </div>

              <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', padding: '20px', borderRadius: '12px', marginBottom: '8px' }}>
                <div className="flex-row space-between" style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                {totalTax > 0 && <div className="flex-row space-between" style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}><span>Tax</span><span>+ ₹{totalTax.toFixed(2)}</span></div>}
                <div className="flex-row space-between" style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', borderTop: '1px dashed var(--border-light)', paddingTop: '12px' }}><span>Payable</span><span>₹{finalTotal.toFixed(2)}</span></div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input type="checkbox" id="payLater" checked={payLater} onChange={e => {
                  const checked = e.target.checked;
                  setPayLater(checked);
                  if (checked) setAmountPaid('0');
                  else setAmountPaid(finalTotal.toFixed(2));
                }} style={{ width: 'auto', cursor: 'pointer' }} />
                <label htmlFor="payLater" style={{ margin: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Pay Later (Credit / Partial Payment)</label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label>Discount Amount (₹)</label><input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} /></div>
                <div><label>Amount Paid Today (₹)</label><input type="number" step="0.01" autoComplete="off" name="pos_pay_amt" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} readOnly={!payLater} style={{ opacity: payLater ? 1 : 0.7 }} required /></div>
              </div>

              {orderType === 'delivery' && (
                <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Delivery Details</h4>
                  <div><label>Expected Delivery Date</label><input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} required /></div>
                  
                  {selectedCustomer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="useCustAddr" 
                        checked={useCustomerAddress} 
                        onChange={e => {
                          const checked = e.target.checked;
                          setUseCustomerAddress(checked);
                          if (checked) {
                            const cust = customers.find(c => c.id === selectedCustomer);
                            if (cust?.address) {
                              setDeliveryAddress(cust.address);
                            } else {
                              toast.error('Selected customer has no saved address');
                              setUseCustomerAddress(false);
                            }
                          }
                        }} 
                        style={{ width: 'auto', cursor: 'pointer' }} 
                      />
                      <label htmlFor="useCustAddr" style={{ margin: 0, cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                        Use customer address as delivery address
                      </label>
                    </div>
                  )}

                  <div><label>Delivery Address</label><textarea value={deliveryAddress} onChange={e => { setDeliveryAddress(e.target.value); setUseCustomerAddress(false); }} required style={{ minHeight: '60px' }}></textarea></div>
                  <div><label>Notes (e.g., Courier Name, Bus)</label><input type="text" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} /></div>
                </div>
              )}

              <div style={{ marginBottom: '16px', background: 'var(--bg-hover)', padding: '12px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowTransport(!showTransport)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {showTransport ? '▼ Hide Transport Details' : '▶ Add Transport Details (Optional)'}
                </button>
                {showTransport && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <input 
                        type="checkbox" 
                        id="posInterstate" 
                        checked={isInterstate} 
                        onChange={e => setIsInterstate(e.target.checked)} 
                        style={{ width: 'auto', cursor: 'pointer' }}
                      />
                      <label htmlFor="posInterstate" style={{ margin: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        Apply IGST (Out of State Sale)
                      </label>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', marginBottom: '4px' }}>Transport Name</label>
                      <input type="text" placeholder="e.g. Rajalakshmi Transport" value={transportName} onChange={e => setTransportName(e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '12px', marginBottom: '4px' }}>LR No. / Docket No.</label>
                        <input type="text" placeholder="e.g. 239" value={lrNumber} onChange={e => setLrNumber(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', marginBottom: '4px' }}>LR Date</label>
                        <input type="date" value={lrDate} onChange={e => setLrDate(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '14px', marginTop: '8px', width: '100%' }}>Confirm Bill</button>
            </form>
          )}
        </Modal>
      )}

      {requireCustomerModal && (
        <Modal
          title="Customer Required"
          onClose={() => setRequireCustomerModal(false)}
          width="400px"
        >
          <form onSubmit={handleQuickAddCustomer} className="modal-body">
            <p style={{ color: 'var(--danger)', fontSize: '14px', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
              Partial payment requires a registered customer to track pending balance. Please add their details.
            </p>
            <div style={{ marginBottom: '12px' }}>
              <label>Customer Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="Enter name" required autoFocus />
            </div>
            <div>
              <label>Phone Number (Optional)</label>
              <input type="text" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="Enter phone" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '14px', marginTop: '20px', width: '100%' }}>Save Customer & Continue</button>
          </form>
        </Modal>
      )}
      <style>{`
        .product-card:hover { border-color: var(--text-primary) !important; transform: translateY(-2px); }
        .qty-input::-webkit-inner-spin-button, .qty-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .qty-input { -moz-appearance: textfield; }

        .pos-card-tooltip {
          position: relative;
        }

        .pos-card-tooltip:hover {
          z-index: 100 !important;
        }

        .pos-card-tooltip .sidebar-style-tooltip {
          opacity: 0;
          visibility: hidden;
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: var(--bg-card);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          white-space: normal;
          width: max-content;
          max-width: 200px;
          word-break: break-word;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
          pointer-events: none;
          z-index: 1000;
          transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
        }

        .pos-card-tooltip .sidebar-style-tooltip::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px 5px 0 5px;
          border-style: solid;
          border-color: var(--bg-card) transparent transparent transparent;
          z-index: 1001;
        }

        .pos-card-tooltip .sidebar-style-tooltip::before {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -6px;
          border-width: 6px 6px 0 6px;
          border-style: solid;
          border-color: var(--border-light) transparent transparent transparent;
          z-index: 1000;
        }

        .pos-card-tooltip:hover .sidebar-style-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
    </div>
  );
}
