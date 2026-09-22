import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, IndianRupee, Edit, Plus, Download, Upload, Trash2, Search } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';

export default function Suppliers() {
  const { currentShop } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forms
  const [formModal, setFormModal] = useState<any>(null); // null when closed, object for Add/Edit
  
  const [paymentModal, setPaymentModal] = useState<any>(null);

  useEffect(() => { 
    if (currentShop) fetchData(); 
  }, [currentShop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data.data || []);
    } catch (error) { toast.error('Failed to load suppliers'); } 
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/suppliers/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'suppliers.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      toast.error('Failed to export suppliers');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsSubmitting(true);
    try {
      const res = await api.post('/suppliers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Import successful');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import suppliers');
    } finally {
      setIsSubmitting(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formModal.id) {
        // Edit mode
        await api.put(`/suppliers/${formModal.id}`, {
          name: formModal.name,
          phone: formModal.phone,
          gst_number: formModal.gst_number,
          address: formModal.address
        });
        toast.success('Supplier updated!');
      } else {
        // Add mode
        await api.post('/suppliers', {
          name: formModal.name,
          phone: formModal.phone,
          gst_number: formModal.gst_number,
          address: formModal.address,
          opening_balance: formModal.opening_balance ? parseFloat(formModal.opening_balance) : 0,
          opening_balance_type: formModal.opening_balance_type || 'to_pay'
        });
        toast.success('Supplier added!');
      }
      setFormModal(null);
      fetchData();
    } catch (error: any) { 
      toast.error(error.response?.data?.message || 'Failed to save supplier'); 
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/suppliers/${paymentModal.supplier_id}/payments?shop_id=${currentShop.id}`, {
        amount_paid: Number(paymentModal.amount),
        payment_mode: paymentModal.received_via,
      });
      toast.success('Payment recorded successfully!');
      setPaymentModal(null);
      fetchData(); // refresh supplier balances
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted successfully!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone || '').includes(searchQuery) ||
    (s.gst_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);
  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage your vendors and their ledger balances</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImport} />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={isSubmitting}>
            <Upload size={18} />
            <span className="desktop-only">{isSubmitting ? 'Importing...' : 'Import'}</span>
          </button>
          <button className="btn btn-secondary" onClick={handleExport} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={18} />
            <span className="desktop-only">Download Template</span>
          </button>
          <button className="btn btn-primary" onClick={() => setFormModal({ name: '', phone: '', gst_number: '', address: '' })} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span className="desktop-only">Add Supplier</span>
          </button>
        </div>
      </header>

      <div className="table-container">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} color="var(--text-secondary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Registered Suppliers</h2>
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by name, phone or GST..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', fontSize: '14px' }}
            />
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Supplier Name</th><th>Phone</th><th>GST</th><th style={{ textAlign: 'right' }}>Outstanding Balance</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>Loading...</td></tr>) 
            : filteredSuppliers.length === 0 ? (<tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>No suppliers found</td></tr>) 
            : paginatedSuppliers.map((s) => (
              <tr key={s.id}>
                <td data-label="Supplier Name" style={{ fontWeight: 500 }}>{s.name}</td>
                <td data-label="Phone">{s.phone || '-'}</td>
                <td data-label="GST">{s.gst_number || '-'}</td>
                <td data-label="Outstanding Balance" style={{ textAlign: 'right', fontWeight: 600, color: s.outstanding_balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  ₹{Number(s.outstanding_balance || 0).toFixed(2)}
                </td>
                <td data-label="Actions" style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button onClick={() => setFormModal(s)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }} title="Edit Supplier"><Edit size={16} color="var(--text-secondary)"/></button>
                  <button onClick={() => handleDelete(s.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }} title="Delete Supplier"><Trash2 size={16} color="var(--danger)"/></button>
                  <button onClick={() => setPaymentModal({ supplier_id: s.id, amount: s.outstanding_balance || '', received_via: 'Bank' })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IndianRupee size={12} /> Make Payment
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredSuppliers.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>

      {paymentModal && (
        <Modal 
          title="Make Supplier Payment"
          onClose={() => setPaymentModal(null)}
          width="480px"
        >
          <form onSubmit={handleReceivePayment} className="modal-body">
              <div className="flex-row gap-4">
                <div style={{ flex: 1 }}><label>Amount Paid (₹)</label><input type="number" step="0.01" autoComplete="off" name="pay_amt_sup" value={paymentModal.amount} onChange={e => setPaymentModal({...paymentModal, amount: e.target.value})} required /></div>
                <div style={{ flex: 1 }}>
                  <label>Paid Via</label>
                  <Select
                    options={[{value: 'Cash', label: 'Cash'}, {value: 'UPI', label: 'UPI'}, {value: 'Bank', label: 'Bank Transfer'}]}
                    value={paymentModal.received_via ? {value: paymentModal.received_via, label: paymentModal.received_via} : null}
                    onChange={(opt: any) => setPaymentModal({...paymentModal, received_via: opt?.value})}
                    styles={{ ...selectStyles, menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '16px', width: '100%' }}>Confirm Payment</button>
            </form>
        </Modal>
      )}

      {formModal && (
        <Modal 
          title={formModal.id ? "Edit Supplier" : "Add Supplier"}
          onClose={() => setFormModal(null)}
          width="480px"
        >
          <form onSubmit={handleFormSubmit} className="modal-body">
              <div style={{ marginBottom: '16px' }}><label>Name <span style={{ color: 'var(--danger)' }}>*</span></label><input value={formModal.name} onChange={e => setFormModal({...formModal, name: e.target.value})} required /></div>
              <div style={{ marginBottom: '16px' }}><label>Phone</label><input value={formModal.phone || ''} onChange={e => setFormModal({...formModal, phone: e.target.value})} placeholder="e.g. 9876543210" /></div>
              <div style={{ marginBottom: '16px' }}><label>GST Number</label><input value={formModal.gst_number || ''} onChange={e => setFormModal({...formModal, gst_number: e.target.value.toUpperCase()})} placeholder="e.g. 33AAAAA0000A1Z5" /></div>
              
              {!formModal.id && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Opening Balance (₹)</label>
                    <input type="number" step="0.01" value={formModal.opening_balance || ''} onChange={e => setFormModal({...formModal, opening_balance: e.target.value})} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Balance Type</label>
                    <select 
                      value={formModal.opening_balance_type || 'to_pay'} 
                      onChange={e => setFormModal({...formModal, opening_balance_type: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '14px' }}
                    >
                      <option value="to_pay">To Pay (You owe supplier)</option>
                      <option value="to_receive">To Receive (Supplier owes you / Advance)</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}><label>Address</label><input value={formModal.address || ''} onChange={e => setFormModal({...formModal, address: e.target.value})} placeholder="Street, City, Pincode" /></div>
              <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '16px', width: '100%' }}>{formModal.id ? "Save Changes" : "Create Supplier"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
