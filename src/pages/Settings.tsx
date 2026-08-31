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

  useEffect(() => {
    fetchBusiness();
  }, []);

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
      toast.success('Business profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update business profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Business Profile & Settings</h1>
          <p className="page-subtitle">Configure your invoice and business details</p>
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

        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 24px' }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
