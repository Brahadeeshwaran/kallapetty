import { useState, useEffect } from 'react';
import { Building, FileText, Landmark } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    owner_phone: '',
    address: '',
    gst_number: '',
    upi_id: '',
    bank_details: '',
    terms_conditions: '',
    logo_url: '',
    invoice_format: 'thermal',
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    invoice_prefix: '',
    invoice_suffix: '',
    next_invoice_number: 1,
    invoice_padding: 1,
  });

  const [customColumns, setCustomColumns] = useState<any[]>([]);

  const defaultSystemCols = [
    { id: 'item_name', name: 'Item Name', scope: 'system', align: 'left', show_on_invoice: true },
    { id: 'qty', name: 'Qty', scope: 'system', align: 'center', show_on_invoice: true },
    { id: 'price', name: 'Rate', scope: 'system', align: 'right', show_on_invoice: true },
    { id: 'amount', name: 'Amount', scope: 'system', align: 'right', show_on_invoice: true },
  ];

  useEffect(() => {
    fetchBusiness();
    fetchShopSettings();
  }, []);

  const fetchShopSettings = async () => {
    try {
      const res = await api.get('/shops');
      const shop = res.data.data?.[0];
      if (shop) {
        setInvoiceSettings({
          invoice_prefix: shop.invoice_prefix || '',
          invoice_suffix: shop.invoice_suffix || '',
          next_invoice_number: shop.next_invoice_number || 1,
          invoice_padding: shop.invoice_padding || 1,
        });

        if (shop.custom_column_definitions && shop.custom_column_definitions.length > 0) {
          // Ensure standard system columns are present if missing
          let cols = [...shop.custom_column_definitions];
          defaultSystemCols.forEach(sysCol => {
            if (!cols.some((c: any) => c.id === sysCol.id)) {
              cols.push(sysCol);
            }
          });
          setCustomColumns(cols);
        } else {
          setCustomColumns(defaultSystemCols);
        }
      }
    } catch (error) {
      setCustomColumns(defaultSystemCols);
    }
  };

  const fetchBusiness = async () => {
    try {
      const res = await api.get('/businesses/me');
      const data = res.data.data;
      if (data) {
        setForm({
          name: data.name || '',
          owner_phone: data.owner_phone || '',
          address: data.address || '',
          gst_number: data.gst_number || '',
          upi_id: data.upi_id || '',
          bank_details: data.bank_details || '',
          terms_conditions: data.terms_conditions || '',
          logo_url: data.logo_url || '',
          invoice_format: ['thermal', 'a4'].includes(data.invoice_format) ? data.invoice_format : 'thermal',
        });
      }
    } catch (error) {
      toast.error('Failed to load business profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/businesses/me', form);
      const shopsRes = await api.get('/shops');
      const shop = shopsRes.data.data?.[0];
      if (shop) {
        await api.put(`/shops/${shop.id}`, {
          custom_column_definitions: customColumns,
          invoice_prefix: invoiceSettings.invoice_prefix,
          invoice_suffix: invoiceSettings.invoice_suffix,
          next_invoice_number: Number(invoiceSettings.next_invoice_number) || 1,
          invoice_padding: Number(invoiceSettings.invoice_padding) || 1,
        });
      }
      toast.success('Settings and invoice configuration updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setCustomColumns(cols => {
      const activeCols = cols.filter(c => c.show_on_invoice !== false);
      const inactiveCols = cols.filter(c => c.show_on_invoice === false);

      const reorderedActive = [...activeCols];
      const item = reorderedActive.splice(draggedIdx, 1)[0];
      reorderedActive.splice(targetIdx, 0, item);

      return [...reorderedActive, ...inactiveCols];
    });
    setDraggedIdx(null);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading settings...</div>;

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Business Profile & Invoice Settings</h1>
          <p className="page-subtitle">Configure your invoice layout, business profile & dynamic table columns</p>
        </div>
      </header>

      <form onSubmit={handleSave} className="card">
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={18} color="var(--accent-blue)" /> Basic Details
        </h2>
        
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div>
            <label>Business Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label>Owner Phone</label>
            <input value={form.owner_phone} onChange={e => setForm({...form, owner_phone: e.target.value})} required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Business Address</label>
            <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={3} placeholder="Full address for invoice" />
          </div>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Landmark size={18} color="var(--warning)" /> Tax & Banking
        </h2>
        
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div>
            <label>GST Number</label>
            <input value={form.gst_number} onChange={e => setForm({...form, gst_number: e.target.value})} placeholder="e.g. 33AAAAA0000A1Z5" />
          </div>
          <div>
            <label>UPI ID (For Payments)</label>
            <input value={form.upi_id} onChange={e => setForm({...form, upi_id: e.target.value})} placeholder="e.g. yourname@bank" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Bank Account Details</label>
            <textarea value={form.bank_details} onChange={e => setForm({...form, bank_details: e.target.value})} rows={2} placeholder="Acct No: 123456... IFSC: ABCD0001" />
          </div>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="var(--success)" /> Invoice Configuration
        </h2>
        
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div>
            <label>Invoice Print Format</label>
            <Select
              options={[{value: 'thermal', label: '3-inch Thermal Receipt (Retail)'}, {value: 'a4', label: 'A4 PDF Size (B2B/Wholesale)'}]}
              value={form.invoice_format ? {value: form.invoice_format, label: form.invoice_format === 'thermal' ? '3-inch Thermal Receipt (Retail)' : 'A4 PDF Size (B2B/Wholesale)'} : {value: 'thermal', label: '3-inch Thermal Receipt (Retail)'}}
              onChange={(opt: any) => setForm({...form, invoice_format: opt?.value})}
              styles={selectStyles}
            />
          </div>
          <div>
            <label>Logo URL</label>
            <input value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} placeholder="https://..." />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Terms & Conditions (Printed on Invoice)</label>
            <textarea value={form.terms_conditions} onChange={e => setForm({...form, terms_conditions: e.target.value})} rows={3} placeholder="1. Goods once sold will not be taken back..." />
          </div>
        </div>

        {/* INVOICE NUMBERING CONFIGURATION */}
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="var(--accent-blue)" /> Sequential Invoice Numbering
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Configure custom serial bill numbers (e.g. SMT001, SMT/26-27/0001, or plain numbers like 239).
        </p>

        <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <div className="grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
            <div>
              <label>Prefix (e.g., SMT, SMT/26-27/)</label>
              <input
                type="text"
                placeholder="e.g. SMT"
                value={invoiceSettings.invoice_prefix}
                onChange={e => setInvoiceSettings({ ...invoiceSettings, invoice_prefix: e.target.value })}
              />
            </div>
            <div>
              <label>Starting / Next Bill Number</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 1 or 239"
                value={invoiceSettings.next_invoice_number}
                onChange={e => setInvoiceSettings({ ...invoiceSettings, next_invoice_number: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label>Number Padding Digits</label>
              <select
                value={invoiceSettings.invoice_padding}
                onChange={e => setInvoiceSettings({ ...invoiceSettings, invoice_padding: parseInt(e.target.value) || 1 })}
              >
                <option value={1}>No Padding (1, 2, ..., 239)</option>
                <option value={2}>2 Digits (01, 02, ..., 99)</option>
                <option value={3}>3 Digits (001, 002, ..., 999)</option>
                <option value={4}>4 Digits (0001, 0002, ..., 9999)</option>
                <option value={5}>5 Digits (00001, 00002, ...)</option>
              </select>
            </div>
            <div>
              <label>Suffix (Optional)</label>
              <input
                type="text"
                placeholder="e.g. /TN or -A"
                value={invoiceSettings.invoice_suffix}
                onChange={e => setInvoiceSettings({ ...invoiceSettings, invoice_suffix: e.target.value })}
              />
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--accent-blue)', padding: '12px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Invoice Number Preview:</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.05em' }}>
              {invoiceSettings.invoice_prefix}
              {String(invoiceSettings.next_invoice_number || 1).padStart(invoiceSettings.invoice_padding || 1, '0')}
              {invoiceSettings.invoice_suffix}
            </span>
          </div>
        </div>

        {/* 1. TOP COLUMN POOL & CONFIGURATION */}
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="var(--accent-blue)" /> 1. Select Columns & Attributes (Top Pool)
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Check columns to print on invoice, edit labels, or add custom fields like Meter, HSN, Weight, or IMEI.
        </p>

        <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => {
              setCustomColumns([
                { id: 'item_name', name: 'Item Name', scope: 'system', align: 'left', show_on_invoice: true },
                { id: 'hsn_code', name: 'HSN', scope: 'product', align: 'center', show_on_invoice: true },
                { id: 'qty', name: 'Qty', scope: 'system', align: 'center', show_on_invoice: true },
                { id: 'price', name: 'Rate', scope: 'system', align: 'right', show_on_invoice: true },
                { id: 'amount', name: 'Amt', scope: 'system', align: 'right', show_on_invoice: true },
              ]);
            }} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>Preset: Standard General Store</button>
            
            <button type="button" onClick={() => {
              setCustomColumns([
                { id: 'meter', name: 'Meter', scope: 'pos', align: 'center', show_on_invoice: true },
                { id: 'item_name', name: 'Product', scope: 'system', align: 'left', show_on_invoice: true },
                { id: 'price', name: 'Rate', scope: 'system', align: 'right', show_on_invoice: true },
                { id: 'qty', name: 'Qty', scope: 'system', align: 'center', show_on_invoice: true },
                { id: 'amount', name: 'Total', scope: 'system', align: 'right', show_on_invoice: true },
              ]);
            }} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>Preset: Textile / Pipe Shop (Meter First)</button>

            <button type="button" onClick={() => {
              setCustomColumns([
                { id: 'item_name', name: 'Model / Item', scope: 'system', align: 'left', show_on_invoice: true },
                { id: 'imei_serial', name: 'Serial / IMEI', scope: 'pos', align: 'center', show_on_invoice: true },
                { id: 'qty', name: 'Qty', scope: 'system', align: 'center', show_on_invoice: true },
                { id: 'price', name: 'Price', scope: 'system', align: 'right', show_on_invoice: true },
                { id: 'amount', name: 'Amt', scope: 'system', align: 'right', show_on_invoice: true },
              ]);
            }} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>Preset: Mobile / Electronics</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {customColumns.map((col, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                {/* Print Toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '13px', fontWeight: 600, cursor: 'pointer', minWidth: '130px' }}>
                  <input
                    type="checkbox"
                    checked={col.show_on_invoice !== false}
                    onChange={e => {
                      const checked = e.target.checked;
                      setCustomColumns(cols => cols.map((c, i) => i === idx ? { ...c, show_on_invoice: checked } : c));
                    }}
                  />
                  {col.show_on_invoice !== false ? '✅ Enabled' : '❌ Hidden'}
                </label>

                {/* Label */}
                <div style={{ flex: 2 }}>
                  <input
                    type="text"
                    value={col.name}
                    placeholder="Column Label"
                    onChange={e => {
                      const val = e.target.value;
                      const id = col.scope === 'system' ? col.id : (val.toLowerCase().replace(/[^a-z0-9]/g, '_') || col.id);
                      setCustomColumns(cols => cols.map((c, i) => i === idx ? { ...c, name: val, id } : c));
                    }}
                    required
                  />
                </div>

                {/* Scope */}
                {col.scope !== 'system' ? (
                  <div style={{ flex: 2 }}>
                    <select
                      value={col.scope}
                      onChange={e => {
                        const scope = e.target.value as 'product' | 'pos';
                        setCustomColumns(cols => cols.map((c, i) => i === idx ? { ...c, scope } : c));
                      }}
                    >
                      <option value="product">Product Attribute</option>
                      <option value="pos">POS Input per Item</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ flex: 2 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '4px', display: 'inline-block' }}>
                      Standard ({col.id})
                    </span>
                  </div>
                )}

                {/* Alignment */}
                <div style={{ width: '110px' }}>
                  <select
                    value={col.align || 'center'}
                    onChange={e => {
                      const align = e.target.value;
                      setCustomColumns(cols => cols.map((c, i) => i === idx ? { ...c, align } : c));
                    }}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                {/* Delete (Custom Only) */}
                {col.scope !== 'system' && (
                  <button
                    type="button"
                    onClick={() => setCustomColumns(cols => cols.filter((_, i) => i !== idx))}
                    className="btn btn-danger"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCustomColumns(cols => [...cols, { id: `col_${Date.now()}`, name: 'New Field', scope: 'pos', align: 'center', show_on_invoice: true }])}
            className="btn btn-secondary"
            style={{ fontSize: '13px' }}
          >
            + Add Custom Column
          </button>
        </div>

        {/* 2. BOTTOM INTERACTIVE DRAG AND DROP TABLE EDITOR */}
        <div style={{ background: '#fff', border: '2px solid var(--accent-blue)', padding: '20px', borderRadius: '8px', marginBottom: '24px', color: '#000', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#111', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🖐️ 2. Interactive Drag & Drop Invoice Table Editor
              </h3>
              <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
                Drag and drop table header columns below left or right to set your printed invoice order!
              </p>
            </div>
            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
              Format: {form.invoice_format === 'thermal' ? '3-inch Thermal Receipt' : 'A4 PDF Sheet'}
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #94a3b8' }}>
                  {customColumns.filter(c => c.show_on_invoice !== false).map((col, idx) => (
                    <th
                      key={col.id}
                      draggable={true}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                      style={{
                        padding: '12px 10px',
                        textAlign: col.align || 'left',
                        borderRight: '1px solid #cbd5e1',
                        cursor: 'grab',
                        userSelect: 'none',
                        background: draggedIdx === idx ? '#dbeafe' : 'inherit',
                        transition: 'background 0.2s',
                        position: 'relative'
                      }}
                      title="Drag left or right to reorder column"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}>
                        <span style={{ color: '#94a3b8', fontSize: '14px', cursor: 'grab' }}>:::</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{col.name || col.id}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {customColumns.filter(c => c.show_on_invoice !== false).map((col) => {
                    let dummyVal = '-';
                    if (col.id === 'item_name') dummyVal = 'PVC Pipe 2 inch';
                    else if (col.id === 'qty') dummyVal = '5 Pcs';
                    else if (col.id === 'price') dummyVal = '₹120.00';
                    else if (col.id === 'amount') dummyVal = '₹600.00';
                    else if (col.id === 'meter') dummyVal = '10m';
                    else if (col.id === 'hsn_code') dummyVal = '3917';
                    else if (col.id === 'imei_serial') dummyVal = '86204910284';
                    else dummyVal = 'Sample Data';

                    return (
                      <td key={col.id} style={{ padding: '12px 10px', textAlign: col.align || 'left', borderRight: '1px solid #f1f5f9', color: '#334155' }}>
                        {dummyVal}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '8px', textAlign: 'center' }}>
            💡 Tip: Click and drag any table header cell (:::) to swap column positions!
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 24px' }}>
            {saving ? 'Saving...' : 'Save Settings & Column Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
