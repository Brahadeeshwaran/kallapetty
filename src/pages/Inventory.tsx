import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Edit, History, Plus, Sliders, Download, Upload, Search } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';

export default function Inventory() {
  const { currentShop, hasPermission } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [formModal, setFormModal] = useState<any>(null);
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState<number | string>(0);
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [stockLogs, setStockLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customColumns, setCustomColumns] = useState<any[]>([]);

  useEffect(() => {
    if (currentShop) {
      fetchData();
      api.get('/shops').then(res => {
        const shop = res.data.data?.find((s: any) => s.id === currentShop.id);
        if (shop && shop.custom_column_definitions) {
          setCustomColumns(shop.custom_column_definitions.filter((c: any) => c.scope === 'product'));
        }
      }).catch(() => {});
    }
  }, [currentShop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const productsRes = await api.get(`/products?shop_id=${currentShop.id}`);
      setProducts(productsRes.data.data || []);
    } catch (error) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/products/export?shop_id=${currentShop.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      toast.error('Failed to export inventory');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('shop_id', currentShop.id);

    setIsSubmitting(true);
    try {
      const res = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Import successful');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import inventory');
    } finally {
      setIsSubmitting(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop) return;
    try {
      const payload = {
        name: formModal.name,
        barcode: formModal.barcode,
        price: parseFloat(formModal.price),
        stock: parseInt(formModal.stock, 10),
        tax_rate: parseFloat(formModal.tax_rate || 0),
        tax_type: formModal.tax_type || 'flat',
        unit: formModal.unit || 'Pcs',
        custom_attributes: formModal.custom_attributes || {},
      };

      if (formModal.id) {
        if (!hasPermission('inventory:edit')) return toast.error('Permission denied');
        await api.put(`/products/${formModal.id}`, { ...payload, is_service: formModal.is_service });
        toast.success('Product updated!');
      } else {
        if (!hasPermission('inventory:create')) return toast.error('Permission denied');
        await api.post('/products', {
          ...payload,
          shop_id: currentShop.id,
          is_service: formModal.is_service || false
        });
        toast.success('Product added!');
      }
      setFormModal(null);
      fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to save product'); }
  };

  const handleDelete = async (id: string) => {
    if (!hasPermission('inventory:delete')) return toast.error('Permission denied');
    if (!window.confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); fetchData(); }
    catch (error) { toast.error('Failed to delete'); }
  };

  const openHistory = async (product: any) => {
    setHistoryModal(product);
    setStockLogs([]);
    setLogsLoading(true);
    try {
      const res = await api.get(`/products/${product.id}/stock-logs`);
      setStockLogs(res.data.data || []);
    } catch (error: any) {
      toast.error('Failed to load stock history');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal) return;
    try {
      const newStock = Math.max(0, parseInt(adjustModal.stock, 10) + Number(adjustAmount));
      await api.put(`/products/${adjustModal.id}`, { stock: newStock });
      toast.success('Stock adjusted successfully!');
      setAdjustModal(null);
      setAdjustAmount(0);
      fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to adjust stock'); }
  };

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <div className="flex-row gap-4">
          <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImport} />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={isSubmitting}>
            <Upload size={18} />
            <span className="desktop-only">{isSubmitting ? 'Importing...' : 'Import'}</span>
          </button>
          <button className="btn btn-secondary" onClick={handleExport} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={18} />
            <span className="desktop-only">Download Template</span>
          </button>
          <button className="btn btn-primary" onClick={() => setFormModal({ name: '', barcode: '', price: '', stock: '', tax_rate: '0', tax_type: 'flat' })} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span className="desktop-only">Add Product</span>
          </button>
        </div>
      </header>

      <div className="table-container">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Product Catalog</h2>
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by name or barcode..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', fontSize: '14px' }}
            />
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              {customColumns.map((col: any) => (
                <th key={col.id}>{col.name}</th>
              ))}
              <th>Price</th>
              <th>Tax</th>
              <th>Stock</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan={5 + customColumns.length} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>Loading...</td></tr>)
              : filteredProducts.length === 0 ? (<tr><td colSpan={5 + customColumns.length} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>No products found</td></tr>)
                : paginatedProducts.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Product">
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.barcode && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.barcode}</div>}
                      {p.is_service && <span style={{ fontSize: '10px', background: 'var(--accent-blue)', color: 'white', padding: '2px 4px', borderRadius: '4px', marginLeft: '4px' }}>Service</span>}
                    </td>
                    {customColumns.map((col: any) => (
                      <td key={col.id} data-label={col.name}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {p.custom_attributes?.[col.id] || '-'}
                        </span>
                      </td>
                    ))}
                    <td data-label="Price">₹{parseFloat(p.price).toFixed(2)}</td>
                    <td data-label="Tax">
                      <span style={{ fontSize: '12px', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}>
                        {parseFloat(p.tax_rate) > 0 ? `${parseFloat(p.tax_rate)}% ${p.tax_type.toUpperCase()}` : 'No Tax'}
                      </span>
                    </td>
                    <td data-label="Stock">
                      {p.is_service ? (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>
                      ) : (
                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', fontWeight: 500, background: p.stock <= 5 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: p.stock <= 5 ? 'var(--danger)' : 'var(--success)' }}>
                          {p.stock} {p.unit || 'Pcs'}
                        </span>
                      )}
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right', display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button title="View History" onClick={() => openHistory(p)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}><History size={16} color="var(--accent-blue)" /></button>
                      <button title="Adjust Stock" onClick={() => { setAdjustModal({ ...p }); setAdjustAmount(0); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}><Sliders size={16} color="var(--text-secondary)" /></button>
                      <button title="Edit product" onClick={() => setFormModal({ ...p })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}><Edit size={16} color="var(--text-secondary)" /></button>
                      <button title="Delete product" onClick={() => handleDelete(p.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}><Trash2 size={16} color="var(--danger)" /></button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredProducts.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>

      {formModal && (
        <Modal
          title={formModal.id ? "Edit Product" : "New Product"}
          onClose={() => setFormModal(null)}
          width="480px"
        >
          <form onSubmit={handleFormSubmit} className="modal-body">
            <div><label>Product Name</label><input value={formModal.name} onChange={e => setFormModal({ ...formModal, name: e.target.value })} required /></div>
            <div><label>Barcode</label><input value={formModal.barcode || ''} onChange={e => setFormModal({ ...formModal, barcode: e.target.value })} /></div>
            <div className="flex-row gap-4">
              <div style={{ flex: 1 }}><label>Price (₹)</label><input type="number" step="0.01" value={formModal.price} onChange={e => setFormModal({ ...formModal, price: e.target.value })} required /></div>
              <div style={{ flex: 1 }}><label>Stock</label><input type="number" value={formModal.stock} onChange={e => setFormModal({ ...formModal, stock: e.target.value })} required /></div>
              <div style={{ flex: 1 }}><label>Unit</label><input type="text" placeholder="e.g. Pcs, Kg, Meter" value={formModal.unit || 'Pcs'} onChange={e => setFormModal({ ...formModal, unit: e.target.value })} required /></div>
            </div>

            {customColumns.length > 0 && (
              <div className="grid-2">
                {customColumns.map((col: any) => (
                  <div key={col.id}>
                    <label>{col.name}</label>
                    <input
                      type="text"
                      placeholder={`Enter ${col.name}`}
                      value={formModal.custom_attributes?.[col.id] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setFormModal((fm: any) => ({
                          ...fm,
                          custom_attributes: { ...(fm.custom_attributes || {}), [col.id]: val }
                        }));
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex-row gap-4" style={{ marginTop: '16px' }}>
              <div style={{ flex: 1 }}><label>Tax Rate (%)</label><input type="number" step="0.1" value={formModal.tax_rate || 0} onChange={e => setFormModal({ ...formModal, tax_rate: e.target.value })} required /></div>
              <div style={{ flex: 1 }}><label>Tax Type</label>
                <Select
                  options={[{ value: 'flat', label: 'Flat Tax' }, { value: 'gst', label: 'GST (CGST/SGST)' }]}
                  value={formModal.tax_type ? { value: formModal.tax_type, label: formModal.tax_type === 'flat' ? 'Flat Tax' : 'GST (CGST/SGST)' } : { value: 'flat', label: 'Flat Tax' }}
                  onChange={(opt: any) => setFormModal({ ...formModal, tax_type: opt?.value })}
                  styles={selectStyles}
                />
              </div>
            </div>

            {currentShop?.allow_service_products && (
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="is_service_toggle"
                  checked={formModal.is_service || false} 
                  onChange={e => setFormModal({ ...formModal, is_service: e.target.checked, stock: e.target.checked ? 0 : formModal.stock })} 
                />
                <label htmlFor="is_service_toggle" style={{ margin: 0, cursor: 'pointer' }}>This is a Service (No Stock Tracking)</label>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '16px', width: '100%' }}>{formModal.id ? "Save Changes" : "Create Product"}</button>
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
                <button type="button" onClick={() => setAdjustAmount(a => Number(a) - 1)} className="btn btn-secondary" style={{ padding: '8px 12px' }}>-</button>
                <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value === '' ? '' : parseInt(e.target.value))} style={{ flex: 1, textAlign: 'center' }} />
                <button type="button" onClick={() => setAdjustAmount(a => Number(a) + 1)} className="btn btn-secondary" style={{ padding: '8px 12px' }}>+</button>
              </div>
              <div style={{ marginTop: '12px', fontSize: '14px', textAlign: 'center' }}>
                New Stock will be: <strong>{Math.max(0, parseInt(adjustModal.stock, 10) + Number(adjustAmount))}</strong>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '14px', marginTop: '20px', width: '100%' }}>Confirm Adjustment</button>
          </form>
        </Modal>
      )}

      {historyModal && (
        <Modal title={`Stock History: ${historyModal.name}`} onClose={() => setHistoryModal(null)} width="500px">
          <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
            {logsLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history...</div>
            ) : stockLogs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No history found for this product.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stockLogs.map((log: any) => (
                  <div key={log.id} style={{ display: 'flex', gap: '16px', padding: '16px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{log.change_type.replace('_', ' ')}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        By: <span style={{ color: 'var(--text-primary)' }}>{log.created_by_name || 'System'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{log.old_stock}</span>
                        <span>→</span>
                        <span style={{ fontWeight: 600 }}>{log.new_stock}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: log.qty_change > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {log.qty_change > 0 ? `+${log.qty_change}` : log.qty_change}
                        </span>
                      </div>
                      {log.reference_id && log.change_type === 'purchase_order' && (
                        <div style={{ marginTop: '12px', fontSize: '12px' }}>
                          <a href="/purchases" style={{ color: 'var(--primary)', textDecoration: 'none' }}>View Purchase Order</a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
