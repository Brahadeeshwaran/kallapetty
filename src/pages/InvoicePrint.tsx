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

  useEffect(() => {
    if (!id) return;
    const fetchInvoiceData = async () => {
      try {
        // Find the specific order. In a real app we might have a GET /orders/:id
        // Since we only have GET /orders for the shop, we fetch and find.
        const res = await api.get('/orders');
        const allOrders = res.data.data;
        const currentOrder = allOrders.find((o: any) => o.id === id);
        
        if (!currentOrder) {
          toast.error("Order not found");
          setLoading(false);
          return;
        }
        
        setOrder(currentOrder);

        // Fetch business details
        const bRes = await api.get('/businesses/me');
        setBusiness(bRes.data.data);
        
        setLoading(false);

        // Auto print after a short delay if not in preview mode
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
  
  const finalTotal = parseFloat(order.total_amount) - parseFloat(order.discount_amount);
  const amountPaid = parseFloat(order.amount_paid) || 0;
  const balanceDue = Math.max(0, finalTotal - amountPaid);
  
  const urlParams = new URLSearchParams(window.location.search);
  const copyLabel = urlParams.get('label') || '';

  if (isThermal) {
    return (
      <div style={{
        width: '300px', // Standard thermal printer width (80mm)
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
          <p style={{ margin: '2px 0' }}>Bill No: {order.id.split('-')[0].toUpperCase()}</p>
          <p style={{ margin: '2px 0' }}>Date: {formatDate(order.created_at)}</p>
          {order.customer && <p style={{ margin: '2px 0' }}>Customer: {order.customer.name}</p>}
        </div>

        <table style={{ width: '100%', marginBottom: '10px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item</th>
              <th style={{ textAlign: 'center', paddingBottom: '4px' }}>Qty</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item: any) => (
              <tr key={item.id}>
                <td style={{ padding: '4px 0' }}>{item.product?.name || 'Item'}</td>
                <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.qty}</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{(parseFloat(item.price) * item.qty).toFixed(2)}</td>
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
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax (GST)</span>
              <span>{parseFloat(order.tax_amount).toFixed(2)}</span>
            </div>
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
          <h2 style={{ margin: 0, fontSize: '32px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px' }}>
            {copyLabel ? `${copyLabel} INVOICE` : 'TAX INVOICE'}
          </h2>
          <div style={{ marginTop: '20px' }}>
            <p style={{ margin: '5px 0' }}><strong>Invoice No:</strong> {order.id.split('-')[0].toUpperCase()}</p>
            <p style={{ margin: '5px 0' }}><strong>Date:</strong> {formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '4px', width: '45%' }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>Billed To:</h3>
          {order.customer ? (
            <>
              <p style={{ margin: '3px 0', fontWeight: 'bold', fontSize: '16px' }}>{order.customer.name}</p>
              {order.customer.phone && <p style={{ margin: '3px 0', fontSize: '14px' }}>Phone: {order.customer.phone}</p>}
            </>
          ) : (
            <p style={{ margin: '3px 0', color: '#888' }}>Walk-in Customer</p>
          )}
        </div>
        <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '4px', width: '45%' }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>Payment Status:</h3>
          <p style={{ margin: '3px 0', fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase', color: order.status === 'paid' ? '#10b981' : order.status === 'partial' ? '#f59e0b' : '#ef4444' }}>
            {order.status}
          </p>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#333', color: '#fff' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>Item Description</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Unit Price (₹)</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Tax (₹)</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items?.map((item: any, idx: number) => {
             const basePrice = parseFloat(item.price);
             const itemTax = parseFloat(item.tax_amount) || 0;
             const lineTotal = (basePrice * item.qty) + itemTax;
             return (
               <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                 <td style={{ padding: '8px', textAlign: 'left' }}>{item.product?.name || `Product ${idx+1}`}</td>
                 <td style={{ padding: '8px', textAlign: 'center' }}>{item.qty}</td>
                 <td style={{ padding: '8px', textAlign: 'right' }}>{basePrice.toFixed(2)}</td>
                 <td style={{ padding: '8px', textAlign: 'right' }}>{itemTax.toFixed(2)}</td>
                 <td style={{ padding: '8px', textAlign: 'right' }}>{lineTotal.toFixed(2)}</td>
               </tr>
             )
          })}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' }}>
            <span>Subtotal:</span>
            <span>₹{(parseFloat(order.total_amount) - parseFloat(order.tax_amount)).toFixed(2)}</span>
          </div>
          {parseFloat(order.tax_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' }}>
              <span>Total Tax:</span>
              <span>₹{parseFloat(order.tax_amount).toFixed(2)}</span>
            </div>
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
