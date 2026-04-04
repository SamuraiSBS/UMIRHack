import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function Products() {
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', price: '', imageUrl: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', imageUrl: '', category: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function loadProducts() {
    return api.get('/business/my/products').then(r => setProducts(r.data));
  }

  useEffect(() => {
    api.get('/business/my')
      .then(r => {
        setBusiness(r.data);
        return loadProducts();
      })
      .catch(() => setError('Сначала создайте заведение в разделе Заказы'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setEdit = (k) => (e) => setEditForm(f => ({ ...f, [k]: e.target.value }));

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.price) { setError('Название и цена обязательны'); return; }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.post('/products', {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        imageUrl: form.imageUrl || null,
        category: form.category || null,
      });
      setForm({ name: '', description: '', price: '', imageUrl: '', category: '' });
      setSuccess('Позиция добавлена!');
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка добавления');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      imageUrl: product.imageUrl || '',
      category: product.category || '',
    });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: '', description: '', price: '', imageUrl: '', category: '' });
  }

  async function handleEdit(productId) {
    if (!editForm.name || !editForm.price) { setError('Название и цена обязательны'); return; }
    setError('');
    setEditSaving(true);
    try {
      const res = await api.patch(`/products/${productId}`, {
        name: editForm.name,
        description: editForm.description,
        price: parseFloat(editForm.price),
        imageUrl: editForm.imageUrl || null,
        category: editForm.category || null,
      });
      setProducts(prev => prev.map(p => p.id === productId ? res.data : p));
      setEditingId(null);
      setSuccess('Позиция обновлена!');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    } finally {
      setEditSaving(false);
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

  async function handleToggleAvailable(product) {
    try {
      const res = await api.patch(`/products/${product.id}`, { isAvailable: !product.isAvailable });
      setProducts(prev => prev.map(p => p.id === product.id ? res.data : p));
    } catch (err) {
      setError('Ошибка изменения доступности');
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Описание</label>
              <input value={form.description} onChange={set('description')} placeholder="Томат, моцарелла, базилик" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Категория</label>
              <input value={form.category} onChange={set('category')} placeholder="Горячее, Напитки, Десерты..." />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>Фото (URL изображения)</label>
            <input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://example.com/photo.jpg" />
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
            {editingId === p.id ? (
              /* Inline edit form */
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Название</label>
                    <input value={editForm.name} onChange={setEdit('name')} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Цена (₽)</label>
                    <input type="number" min="0" step="0.01" value={editForm.price} onChange={setEdit('price')} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group">
                    <label>Описание</label>
                    <input value={editForm.description} onChange={setEdit('description')} />
                  </div>
                  <div className="form-group">
                    <label>Категория</label>
                    <input value={editForm.category} onChange={setEdit('category')} placeholder="Горячее, Напитки..." />
                  </div>
                </div>
                <div className="form-group">
                  <label>Фото (URL)</label>
                  <input value={editForm.imageUrl} onChange={setEdit('imageUrl')} placeholder="https://..." />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(p.id)}
                    disabled={editSaving}
                    className="btn-success"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    {editSaving ? '...' : 'Сохранить'}
                  </button>
                  <button onClick={cancelEdit} className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              /* Normal view */
              <>
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{p.name}</h3>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {p.category && (
                        <span style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                          {p.category}
                        </span>
                      )}
                      {!p.isAvailable && (
                        <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                          Нет в наличии
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => startEdit(p)}
                      className="btn-outline"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleToggleAvailable(p)}
                      className={p.isAvailable ? 'btn-outline' : 'btn-success'}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      {p.isAvailable ? 'Скрыть' : 'Показать'}
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="btn-danger"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      {deleting === p.id ? '...' : 'Удалить'}
                    </button>
                  </div>
                </div>
                {p.description && <p className="text-sm text-gray">{p.description}</p>}
                <p style={{ fontWeight: 700, color: '#2563eb', fontSize: '16px' }}>{p.price} ₽</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
