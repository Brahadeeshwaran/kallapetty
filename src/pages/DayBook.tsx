import { useState, useEffect } from 'react';
import { BookOpen, TrendingDown, IndianRupee, Plus } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { selectStyles } from '../lib/utils';

export default function DayBook() {
  const [records, setRecords] = useState<any>({ payments: [], expenses: [], summary: { payments: 0, expenses: 0, net_cash: 0 } });
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [selectedShop, setSelectedShop] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ shop_id: '', amount: '', reason: '' });

  useEffect(() => { 
    api.get('/shops').then(res => {
      const shopData = res.data.data || [];
      setShops(shopData);
      if (shopData.length > 0) {
        setSelectedShop(p => p || shopData[0].id);
        setExpenseForm(p => ({ ...p, shop_id: p.shop_id || shopData[0].id }));
      }
    });
  }, []);

  useEffect(() => {
    if (selectedShop) fetchData();
  }, [selectedShop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance?shop_id=${selectedShop}`);
      const data = res.data.data;
      
      const totalPayments = data.payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
      const totalExpenses = data.expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);
      
      setRecords({
        payments: data.payments,
        expenses: data.expenses,
        summary: {
          payments: totalPayments,
          expenses: totalExpenses,
          net_cash: totalPayments - totalExpenses
        }
      });
    } catch (error) { toast.error('Failed to load day book'); } 
    finally { setLoading(false); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/finance/expenses', { ...expenseForm, amount: parseFloat(expenseForm.amount) });
      toast.success('Expense recorded!');
      setShowForm(false);
      setExpenseForm(p => ({ ...p, amount: '', reason: '' }));
      fetchData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to record expense'); }
  };

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Day Book (Kallapetti)</h1>
          <p className="page-subtitle">Track daily petty cash expenses and received payments</p>
        </div>
        <div className="flex-row gap-4 items-center">
          {shops.length > 1 && (
            <div style={{ width: '200px' }}>
              <Select
                options={[{ value: '', label: 'All Shops' }, ...shops.map(s => ({ value: s.id, label: s.name }))]}
                value={selectedShop ? { value: selectedShop, label: shops.find(s => s.id === selectedShop)?.name } : { value: '', label: 'All Shops' }}
                onChange={(opt: any) => setSelectedShop(opt?.value || '')}
                styles={selectStyles}
              />
            </div>
          )}
          {!showForm && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ padding: '8px 16px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={18} />
              <span className="desktop-only">Record Expense</span>
            </button>
          )}
        </div>
      </header>

      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="flex-row items-center space-between">
            <h3 className="stat-title">Cash Received (Today)</h3>
            <IndianRupee size={16} color="var(--success)" />
          </div>
          <p className="stat-value text-success">₹{records.summary.payments.toFixed(2)}</p>
        </div>
        <div className="card">
          <div className="flex-row items-center space-between">
            <h3 className="stat-title">Petty Cash Expenses</h3>
            <TrendingDown size={16} color="var(--danger)" />
          </div>
          <p className="stat-value text-danger">₹{records.summary.expenses.toFixed(2)}</p>
        </div>
        <div className="card" style={{ border: '1px solid var(--accent-blue)' }}>
          <div className="flex-row items-center space-between">
            <h3 className="stat-title">Net Kallapetti Cash</h3>
            <BookOpen size={16} color="var(--accent-blue)" />
          </div>
          <p className="stat-value" style={{ color: 'var(--accent-blue)' }}>₹{records.summary.net_cash.toFixed(2)}</p>
        </div>
      </div>
      
      {showForm && (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Record Petty Cash Expense</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <form onSubmit={handleAddExpense} className="flex-row gap-4 items-end">
            {shops.length > 1 && (
              <div style={{ flex: 1 }}>
                <label>Shop</label>
                <Select
                  options={shops.map(s => ({ value: s.id, label: s.name }))}
                  value={expenseForm.shop_id ? { value: expenseForm.shop_id, label: shops.find(s => s.id === expenseForm.shop_id)?.name } : null}
                  onChange={(opt: any) => setExpenseForm({...expenseForm, shop_id: opt?.value || ''})}
                  styles={selectStyles}
                  required
                />
              </div>
            )}
            <div style={{ flex: 1.5 }}><label>Reason</label><input value={expenseForm.reason} onChange={e => setExpenseForm({...expenseForm, reason: e.target.value})} placeholder="e.g. Tea, Loadman, Auto" required /></div>
            <div style={{ flex: 1 }}><label>Amount (₹)</label><input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} required /></div>
            <button type="submit" className="btn btn-primary" style={{ height: '42px', background: 'var(--danger)' }}>Deduct</button>
          </form>
        </div>
      )}

      <div className="grid-2">
        <div className="table-container">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IndianRupee size={18} color="var(--success)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Payments Received</h2>
          </div>
          <table>
            <thead><tr><th>Customer</th><th>Via</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              {loading ? (<tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>) : records.payments.length === 0 ? (<tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No payments today</td></tr>) : records.payments.map((p: any) => (
                <tr key={p.id}>
                  <td data-label="Customer">{p.customer?.name || 'Walk-in'}</td>
                  <td data-label="Via"><span style={{ fontSize: '12px', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}>{p.received_via}</span></td>
                  <td data-label="Amount" style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 500 }}>+ ₹{parseFloat(p.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-container">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={18} color="var(--danger)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Daily Expenses</h2>
          </div>
          <table>
            <thead><tr><th>Reason</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              {loading ? (<tr><td colSpan={2} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>) : records.expenses.length === 0 ? (<tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No expenses today</td></tr>) : records.expenses.map((e: any) => (
                <tr key={e.id}>
                  <td data-label="Reason">{e.reason}</td>
                  <td data-label="Amount" style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 500 }}>- ₹{parseFloat(e.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
