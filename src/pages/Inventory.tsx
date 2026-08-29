import { useState, useEffect } from 'react';
import { Trash2, Edit } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';
import Modal from '../components/Modal';

export default function Inventory() {
  const { currentShop } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', barcode: '', price: '', stock: '', tax_rate: '0', tax_type: 'flat' });

  const [editModal, setEditModal] = useState<any>(null);
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);

  useEffect(() => { 
    if (currentShop) fetchData(); 
  }, [currentShop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const productsRes = await api.get(`/products?shop_id=${currentShop.id}`);
      setProducts(productsRes.data.data || []);
    } catch (error) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop) return;
    try {
      await api.post('/products', { ...formData, shop_id: currentShop.id, price: parseFloat(formData.price), stock: parseInt(formData.stock, 10), tax_rate: parseFloat(formData.tax_rate), is_service: false });
      toast.success('Product added!');
      setShowForm(false);
      setFormData({ name: '', barcode: '', price: '', stock: '', tax_rate: '0', tax_type: 'flat' });
      fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to add'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); fetchData(); } 
    catch (error) { toast.error('Failed to delete'); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/products/${editModal.id}`, {
        name: editModal.name,
        barcode: editModal.barcode,
        price: parseFloat(editModal.price),
        stock: parseInt(editModal.stock, 10),
        tax_rate: parseFloat(editModal.tax_rate || 0),
        tax_type: editModal.tax_type || 'flat'
      });
      toast.success('Product updated!');
      setEditModal(null);
      fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to update'); }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal) return;
    try {
      const newStock = Math.max(0, parseInt(adjustModal.stock, 10) + adjustAmount);
      await api.put(`/products/${adjustModal.id}`, { stock: newStock });
      toast.success('Stock adjusted successfully!');
      setAdjustModal(null);
      setAdjustAmount(0);
      fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to adjust stock'); }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <div className="flex-row gap-4">
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add Product'}</button>
        </div>
      </header>
      
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>New Product Details</h3>
          <form onSubmit={handleAddProduct} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: '200px' }}><label>Product Name</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
            <div style={{ flex: 1, minWidth: '150px' }}><label>Barcode</label><input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} /></div>
            <div style={{ flex: 1, minWidth: '100px' }}><label>Price (₹)</label><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required /></div>
            <div style={{ flex: 1, minWidth: '100px' }}><label>Stock</label><input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} required /></div>
            <div style={{ flex: 1, minWidth: '100px' }}><label>Tax Rate (%)</label><input type="number" step="0.1" value={formData.tax_rate} onChange={e => setFormData({...formData, tax_rate: e.target.value})} required /></div>
            <div style={{ flex: 1, minWidth: '100px' }}><label>Tax Type</label>
              <Select
                options={[{value: 'flat', label: 'Flat Tax'}, {value: 'gst', label: 'GST (CGST/SGST)'}]}
                value={formData.tax_type ? {value: formData.tax_type, label: formData.tax_type === 'flat' ? 'Flat Tax' : 'GST (CGST/SGST)'} : null}
                onChange={(opt: any) => setFormData({...formData, tax_type: opt?.value})}
                styles={selectStyles}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Save</button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Product Name</th><th>Barcode</th><th>Price</th><th>Tax</th><th>Stock</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>Loading...</td></tr>) 
            : products.length === 0 ? (<tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>No products found</td></tr>) 
            : products.map((p) => (
              <tr key={p.id}>
                <td data-label="Product Name" style={{ fontWeight: 500 }}>{p.name}</td>
                <td data-label="Barcode"><span style={{ background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.barcode || 'N/A'}</span></td>
                <td data-label="Price">₹{parseFloat(p.price).toFixed(2)}</td>
                <td data-label="Tax">
                  <span style={{ fontSize: '12px', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}>
                    {parseFloat(p.tax_rate) > 0 ? `${parseFloat(p.tax_rate)}% ${p.tax_type.toUpperCase()}` : 'No Tax'}
                  </span>
                </td>
                <td data-label="Stock">
                  <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', fontWeight: 500, background: p.stock <= 5 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: p.stock <= 5 ? 'var(--danger)' : 'var(--success)' }}>{p.stock} units</span>
                </td>
                <td data-label="Actions" style={{ textAlign: 'right', display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button onClick={() => { setAdjustModal({...p}); setAdjustAmount(0); }} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '8px' }}>Adjust</button>
                  <button title="Edit product" onClick={() => setEditModal({...p})} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}><Edit size={16} color="var(--text-secondary)"/></button>
                  <button title="Delete product" onClick={() => handleDelete(p.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}><Trash2 size={16} color="var(--danger)"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editModal && (
        <Modal 
          title="Edit Product"
          onClose={() => setEditModal(null)}
          width="480px"
        >
          <form onSubmit={handleUpdate} className="modal-body">
              <div><label>Product Name</label><input value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })} required /></div>
              <div><label>Barcode</label><input value={editModal.barcode || ''} onChange={e => setEditModal({ ...editModal, barcode: e.target.value })} /></div>
              <div className="flex-row gap-4">
                <div style={{ flex: 1 }}><label>Price (₹)</label><input type="number" step="0.01" value={editModal.price} onChange={e => setEditModal({ ...editModal, price: e.target.value })} required /></div>
                <div style={{ flex: 1 }}><label>Stock</label><input type="number" value={editModal.stock} onChange={e => setEditModal({ ...editModal, stock: e.target.value })} required /></div>
              </div>
              <div className="flex-row gap-4" style={{ marginTop: '16px' }}>
                <div style={{ flex: 1 }}><label>Tax Rate (%)</label><input type="number" step="0.1" value={editModal.tax_rate || 0} onChange={e => setEditModal({ ...editModal, tax_rate: e.target.value })} required /></div>
                <div style={{ flex: 1 }}><label>Tax Type</label>
                  <Select
                    options={[{value: 'flat', label: 'Flat Tax'}, {value: 'gst', label: 'GST (CGST/SGST)'}]}
                    value={editModal.tax_type ? {value: editModal.tax_type, label: editModal.tax_type === 'flat' ? 'Flat Tax' : 'GST (CGST/SGST)'} : {value: 'flat', label: 'Flat Tax'}}
                    onChange={(opt: any) => setEditModal({ ...editModal, tax_type: opt?.value })}
                    styles={selectStyles}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '16px', width: '100%' }}>Save Changes</button>
            </form>
        </Modal>
      )}

      {adjustModal && (
        <Modal 
          title="Adjust Stock"
          onClose={() => setAdjustModal(null)}
          width="350px"
        >
          <form onSubmit={handleAdjustStockSubmit} className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Current stock for <strong>{adjustModal.name}</strong> is <strong>{adjustModal.stock}</strong>.
              </p>
              <div>
                <label>Add / Subtract Stock</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" onClick={() => setAdjustAmount(a => a - 1)} className="btn btn-secondary" style={{ padding: '8px 12px' }}>-</button>
                  <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(parseInt(e.target.value) || 0)} style={{ flex: 1, textAlign: 'center' }} />
                  <button type="button" onClick={() => setAdjustAmount(a => a + 1)} className="btn btn-secondary" style={{ padding: '8px 12px' }}>+</button>
                </div>
                <div style={{ marginTop: '12px', fontSize: '14px', textAlign: 'center' }}>
                  New Stock will be: <strong>{Math.max(0, parseInt(adjustModal.stock, 10) + adjustAmount)}</strong>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '20px', width: '100%' }}>Confirm Adjustment</button>
            </form>
        </Modal>
      )}
    </div>
  );
}
