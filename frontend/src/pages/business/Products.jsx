import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function Products() {
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function loadProducts(bizId) {
    return api.get(`/business/${bizId}/products`).then(r => setProducts(r.data));
  }

  useEffect(() => {
    api.get('/business/my')
      .then(r => {
        setBusiness(r.data);
        return loadProducts(r.data.id);
      })
      .catch(() => setError('Сначала создайте заведение в разделе Заказы'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.price) { setError('Название и цена обязательны'); return; }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.post('/products', { name: form.name, description: form.description, price: parseFloat(form.price) });
      setForm({ name: '', description: '', price: '' });
      setSuccess('Позиция добавлена!');
      await loadProducts(business.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка добавления');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productId) {
    if (!confirm('Удалить позицию?')) return;
    setDeleting(productId);
    try {
      await api.delete(`/products/${productId}`);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Меню — {business?.name}</h1>

      {/* Add product form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Добавить позицию</h2>

        {error && <div className="error-msg">{error}</div>}
        {success && (
          <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Название *</label>
              <input value={form.name} onChange={set('name')} placeholder="Маргарита" required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Цена (₽) *</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="450" required />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>Описание</label>
            <input value={form.description} onChange={set('description')} placeholder="Томат, моцарелла, базилик" />
          </div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '4px' }}>
            {saving ? 'Сохраняем...' : '+ Добавить'}
          </button>
        </form>
      </div>

      {/* Products list */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
        Позиции меню ({products.length})
      </h2>

      {products.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <p className="text-gray">Меню пусто. Добавьте первую позицию!</p>
        </div>
      )}

      <div className="grid grid-2">
        {products.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{p.name}</h3>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={deleting === p.id}
                className="btn-danger"
                style={{ padding: '4px 10px', fontSize: '12px', flexShrink: 0, marginLeft: '8px' }}
              >
                {deleting === p.id ? '...' : 'Удалить'}
              </button>
            </div>
            {p.description && <p className="text-sm text-gray">{p.description}</p>}
            <p style={{ fontWeight: 700, color: '#2563eb', fontSize: '16px' }}>{p.price} ₽</p>
          </div>
        ))}
      </div>
    </div>
  );
}
