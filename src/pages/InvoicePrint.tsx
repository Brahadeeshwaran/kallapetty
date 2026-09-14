import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export default function InvoicePrint() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [shopColumns, setShopColumns] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchInvoiceData = async () => {
      try {
        const res = await api.get('/orders');
        const allOrders = res.data.data;
        const currentOrder = allOrders.find((o: any) => o.id === id);
        
        if (!currentOrder) {
          toast.error("Order not found");
          setLoading(false);
          return;
        }
        
        setOrder(currentOrder);

        const bRes = await api.get('/businesses/me');
        setBusiness(bRes.data.data);

        api.get('/shops').then(sRes => {
          const shop = sRes.data.data?.find((s: any) => s.id === currentOrder.shop_id);
          if (shop && shop.custom_column_definitions && shop.custom_column_definitions.length > 0) {
            const activeCols = shop.custom_column_definitions.filter((c: any) => c.show_on_invoice !== false);
            if (activeCols.some((c: any) => c.scope === 'system')) {
              if (!activeCols.some((c: any) => c.id === 'sl_no')) {
                setShopColumns([{ id: 'sl_no', name: 'Sl.No', scope: 'system', align: 'center', show_on_invoice: true }, ...activeCols]);
              } else {
                setShopColumns(activeCols);
              }
            } else {
              setShopColumns([
                { id: 'sl_no', name: 'Sl.No', scope: 'system', align: 'center', show_on_invoice: true },
                { id: 'item_name', name: 'Particulars', scope: 'system', align: 'left', show_on_invoice: true },
                ...activeCols,
                { id: 'qty', name: 'Qty', scope: 'system', align: 'center', show_on_invoice: true },
                { id: 'price', name: 'Rate', scope: 'system', align: 'right', show_on_invoice: true },
                { id: 'amount', name: 'Amount', scope: 'system', align: 'right', show_on_invoice: true },
              ]);
            }
          } else {
            setShopColumns([
              { id: 'sl_no', name: 'Sl.No', scope: 'system', align: 'center', show_on_invoice: true },
              { id: 'item_name', name: 'Particulars', scope: 'system', align: 'left', show_on_invoice: true },
              { id: 'qty', name: 'Qty', scope: 'system', align: 'center', show_on_invoice: true },
              { id: 'price', name: 'Rate', scope: 'system', align: 'right', show_on_invoice: true },
              { id: 'amount', name: 'Amount', scope: 'system', align: 'right', show_on_invoice: true },
            ]);
          }
        }).catch(() => {});
        
        setLoading(false);

        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.get('preview')) {
          setTimeout(() => {
            window.print();
          }, 500);
        }
      } catch (error) {
        toast.error('Failed to load invoice details');
        setLoading(false);
      }
    };
    fetchInvoiceData();
  }, [id]);

  if (loading) return <div style={{ padding: '20px' }}>Loading Invoice...</div>;
  if (!order) return <div style={{ padding: '20px' }}>Invoice not found</div>;

  const isThermal = business?.invoice_format === 'thermal';
  const shopName = order.shop?.name || business?.name;
  
  const businessGstState = business?.gst_number ? String(business.gst_number).trim().substring(0, 2) : '';
  const customerGstState = order.customer?.gst_number ? String(order.customer.gst_number).trim().substring(0, 2) : '';

  // Default is CGST + SGST. Applies IGST only if checkbox ticked OR customer GSTIN state differs
  const isInterState = Boolean(
    order.is_interstate || 
    (businessGstState && customerGstState && businessGstState !== customerGstState)
  );
  
  const finalTotal = parseFloat(order.total_amount) - parseFloat(order.discount_amount);
  const amountPaid = parseFloat(order.amount_paid) || 0;
  const balanceDue = Math.max(0, finalTotal - amountPaid);
  
  const urlParams = new URLSearchParams(window.location.search);
  const copyLabel = urlParams.get('label') || '';

  const getCellContent = (item: any, col: any, index: number = 0) => {
    if (col.id === 'sl_no') return index + 1;
    if (col.id === 'item_name') {
      return item.product?.name || 'Item';
    }
    if (col.id === 'unit') return item.unit || '-';
    if (col.id === 'qty') return `${item.qty}${item.unit ? ` ${item.unit}` : ''}`;
    if (col.id === 'price') return parseFloat(item.price).toFixed(2);
    if (col.id === 'tax') return (parseFloat(item.tax_amount) || 0).toFixed(2);
    if (col.id === 'amount') return ((parseFloat(item.price) * item.qty) + (parseFloat(item.tax_amount) || 0)).toFixed(2);
    
    // Custom Columns
    const val = col.scope === 'product' ? item.product?.custom_attributes?.[col.id] : item.custom_inputs?.[col.id];
    return val || '-';
  };

  if (isThermal) {
    return (
      <div style={{
        width: '300px',
        margin: '0 auto',
        padding: '10px',
        background: '#fff',
        color: '#000',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.4'
      }}>
        {business?.logo_url && (
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <img src={business.logo_url} alt="Logo" style={{ maxWidth: '100px', maxHeight: '100px' }} />
          </div>
        )}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>{shopName}</h2>
          {business?.address && <p style={{ margin: '2px 0' }}>{business.address}</p>}
          {business?.gst_number && <p style={{ margin: '2px 0' }}>GSTIN: {business.gst_number}</p>}
          <p style={{ margin: '2px 0' }}>Ph: {business?.owner_phone}</p>
          {copyLabel && <p style={{ margin: '5px 0', fontWeight: 'bold', textTransform: 'uppercase' }}>{copyLabel} INVOICE</p>}
        </div>

        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '5px 0', marginBottom: '10px' }}>
          <p style={{ margin: '2px 0' }}>Bill No: {order.invoice_number || order.id.split('-')[0].toUpperCase()}</p>
          <p style={{ margin: '2px 0' }}>Date: {formatDate(order.created_at)}</p>
          {order.customer && <p style={{ margin: '2px 0' }}>Customer: {order.customer.name}</p>}
          {order.transport_name && <p style={{ margin: '2px 0' }}>Transport: {order.transport_name}</p>}
          {order.lr_number && <p style={{ margin: '2px 0' }}>LR No: {order.lr_number}</p>}
          {order.lr_date && <p style={{ margin: '2px 0' }}>LR Date: {formatDate(order.lr_date)}</p>}
        </div>

        <table style={{ width: '100%', marginBottom: '10px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              {shopColumns.map(col => (
                <th key={col.id} style={{ textAlign: col.align || 'left', paddingBottom: '4px' }}>
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item: any, idx: number) => (
              <tr key={item.id}>
                {shopColumns.map(col => (
                  <td key={col.id} style={{ textAlign: col.align || 'left', padding: '4px 0' }}>
                    {getCellContent(item, col, idx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', paddingTop: '5px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span>{(parseFloat(order.total_amount) - parseFloat(order.tax_amount)).toFixed(2)}</span>
          </div>
          {parseFloat(order.tax_amount) > 0 && (
            isInterState ? (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>IGST</span>
                <span>{parseFloat(order.tax_amount).toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST</span>
                  <span>{(parseFloat(order.tax_amount) / 2).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SGST</span>
                  <span>{(parseFloat(order.tax_amount) / 2).toFixed(2)}</span>
                </div>
              </>
            )
          )}
          {parseFloat(order.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount</span>
              <span>-{parseFloat(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>
            <span>Total</span>
            <span>₹{finalTotal.toFixed(2)}</span>
          </div>
          {amountPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              <span>Amount Paid</span>
              <span>₹{amountPaid.toFixed(2)}</span>
            </div>
          )}
          {balanceDue > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '2px' }}>
              <span>Balance Due</span>
              <span>₹{balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        {business?.terms_conditions && (
          <div style={{ borderTop: '1px dashed #000', paddingTop: '5px', fontSize: '10px', textAlign: 'center' }}>
            <p style={{ margin: '2px 0' }}>{business.terms_conditions}</p>
          </div>
        )}
        
        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px' }}>
          <p>Thank you for visiting!</p>
        </div>
        
        <style>{`
          @media print {
            body { margin: 0; padding: 0; }
            @page { margin: 0; size: 80mm 200mm; }
          }
        `}</style>
      </div>
    );
  }

  // A4 Layout
  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '40px',
      background: '#fff',
      color: '#333',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>
        <div>
          {business?.logo_url && <img src={business.logo_url} alt="Logo" style={{ maxWidth: '150px', maxHeight: '80px', marginBottom: '10px' }} />}
          <h1 style={{ margin: 0, fontSize: '28px', color: '#111' }}>{business?.name}</h1>
          <p style={{ margin: '5px 0', color: '#555', maxWidth: '300px', whiteSpace: 'pre-wrap' }}>{business?.address}</p>
          <p style={{ margin: '5px 0', color: '#555' }}>Phone: {business?.owner_phone}</p>
          {business?.gst_number && <p style={{ margin: '5px 0', color: '#555', fontWeight: 'bold' }}>GSTIN: {business.gst_number}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#444', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
            {copyLabel ? `${copyLabel} INVOICE` : 'TAX INVOICE'}
          </h2>
          <div style={{ marginTop: '12px', fontSize: '13px' }}>
            <p style={{ margin: '3px 0' }}><strong>Invoice No:</strong> {order.invoice_number || order.id.split('-')[0].toUpperCase()}</p>
            <p style={{ margin: '3px 0' }}><strong>Date:</strong> {formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '15px' }}>
        <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '4px', flex: 1 }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>Billed To:</h3>
          {order.customer ? (
            <>
              <p style={{ margin: '3px 0', fontWeight: 'bold', fontSize: '16px' }}>{order.customer.name}</p>
              {order.customer.phone && <p style={{ margin: '3px 0', fontSize: '14px' }}>Phone: {order.customer.phone}</p>}
              {order.customer.address && <p style={{ margin: '3px 0', fontSize: '13px', color: '#666' }}>{order.customer.address}</p>}
              {order.customer.gst_number && <p style={{ margin: '3px 0', fontSize: '13px', color: '#666', fontWeight: 500 }}>GSTIN: {order.customer.gst_number}</p>}
            </>
          ) : (
            <p style={{ margin: '3px 0', color: '#888' }}>Walk-in Customer</p>
          )}
        </div>

        {(order.transport_name || order.lr_number || order.lr_date || order.delivery_address) && (
          <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '4px', flex: 1 }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>Transport & Shipping:</h3>
            {order.transport_name && <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>Transport:</strong> {order.transport_name}</p>}
            {order.lr_number && <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>LR No.:</strong> {order.lr_number}</p>}
            {order.lr_date && <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>LR Date:</strong> {formatDate(order.lr_date)}</p>}
            {order.delivery_address && <p style={{ margin: '3px 0', fontSize: '13px', color: '#444' }}><strong>Ship To:</strong> {order.delivery_address}</p>}
          </div>
        )}

        <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '4px', width: (order.transport_name || order.lr_number || order.lr_date) ? '25%' : '45%' }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>Payment Status:</h3>
          <p style={{ margin: '3px 0', fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase', color: order.status === 'paid' ? '#10b981' : order.status === 'partial' ? '#f59e0b' : '#ef4444' }}>
            {order.status}
          </p>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#333', color: '#fff' }}>
            {shopColumns.map(col => (
              <th key={col.id} style={{ padding: '8px', textAlign: col.align || 'left' }}>
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.order_items?.map((item: any, idx: number) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
              {shopColumns.map(col => (
                <td key={col.id} style={{ padding: '8px', textAlign: col.align || 'left' }}>
                  {getCellContent(item, col, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' }}>
            <span>Subtotal:</span>
            <span>₹{(parseFloat(order.total_amount) - parseFloat(order.tax_amount)).toFixed(2)}</span>
          </div>
          {parseFloat(order.tax_amount) > 0 && (
            isInterState ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                <span>IGST:</span>
                <span>₹{parseFloat(order.tax_amount).toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                  <span>CGST:</span>
                  <span>₹{(parseFloat(order.tax_amount) / 2).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                  <span>SGST:</span>
                  <span>₹{(parseFloat(order.tax_amount) / 2).toFixed(2)}</span>
                </div>
              </>
            )
          )}
          {parseFloat(order.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee', color: '#ef4444' }}>
              <span>Discount:</span>
              <span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #333', fontWeight: 'bold', fontSize: '16px' }}>
            <span>Grand Total:</span>
            <span>₹{finalTotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <span>Amount Paid:</span>
            <span>₹{amountPaid.toFixed(2)}</span>
          </div>
          {balanceDue > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #333', fontWeight: 'bold', fontSize: '15px', color: '#ef4444' }}>
              <span>Balance Due:</span>
              <span>₹{balanceDue.toFixed(2)}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #333', fontWeight: 'bold', fontSize: '15px', color: '#10b981' }}>
              <span>Balance Due:</span>
              <span>₹0.00</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '45%' }}>
          {business?.bank_details && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#555' }}>Bank Details</h4>
              <p style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', color: '#666' }}>{business.bank_details}</p>
            </div>
          )}
          {business?.upi_id && (
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#555' }}>UPI Payment</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{business.upi_id}</p>
            </div>
          )}
        </div>
        
        <div style={{ width: '45%' }}>
          {business?.terms_conditions && (
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#555' }}>Terms & Conditions</h4>
              <p style={{ margin: 0, fontSize: '10px', whiteSpace: 'pre-wrap', color: '#666' }}>{business.terms_conditions}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center', color: '#888', fontSize: '12px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
        This is a computer-generated invoice and does not require a physical signature.
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; background: white; margin: 0; padding: 0; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
