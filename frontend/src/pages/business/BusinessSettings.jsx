import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function BusinessSettings() {
  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', deliveryZone: '' });
  const [points, setPoints] = useState([]);
  const [pointForm, setPointForm] = useState({ name: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingPoint, setAddingPoint] = useState(false);
  const [deletingPoint, setDeletingPoint] = useState(null);
  const [editingPointId, setEditingPointId] = useState(null);
  const [editPointForm, setEditPointForm] = useState({ name: '', address: '' });
  const [editingPointSaving, setEditingPointSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/business/my'),
      api.get('/business/my/trading-points'),
    ])
      .then(([bizRes, pointsRes]) => {
        setBusiness(bizRes.data);
        setForm({
          name: bizRes.data.name || '',
          description: bizRes.data.description || '',
          deliveryZone: bizRes.data.deliveryZone || '',
        });
        setPoints(pointsRes.data);
      })
      .catch(() => setError('Сначала создайте заведение'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setPoint = (k) => (e) => setPointForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSaveBusiness(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await api.patch('/business/my', form);
      setBusiness(res.data);
      setSuccess('Данные сохранены!');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPoint(e) {
    e.preventDefault();
    if (!pointForm.name || !pointForm.address) { setError('Название и адрес обязательны'); return; }
    setError('');
    setAddingPoint(true);
    try {
      const res = await api.post('/business/my/trading-points', pointForm);
      setPoints(prev => [...prev, res.data]);
      setPointForm({ name: '', address: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка добавления точки');
    } finally {
      setAddingPoint(false);
    }
  }

  async function handleDeletePoint(id) {
    if (!confirm('Удалить торговую точку?')) return;
    setDeletingPoint(id);
    try {
      await api.delete(`/business/my/trading-points/${id}`);
      setPoints(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    } finally {
      setDeletingPoint(null);
    }
  }

  function startEditPoint(point) {
    setEditingPointId(point.id);
    setEditPointForm({ name: point.name, address: point.address });
    setError('');
  }

  function cancelEditPoint() {
    setEditingPointId(null);
    setEditPointForm({ name: '', address: '' });
  }

  async function handleEditPoint(id) {
    if (!editPointForm.name || !editPointForm.address) { setError('Название и адрес обязательны'); return; }
    setError('');
    setEditingPointSaving(true);
    try {
      const res = await api.patch(`/business/my/trading-points/${id}`, editPointForm);
      setPoints(prev => prev.map(p => p.id === id ? res.data : p));
      setEditingPointId(null);
      setSuccess('Точка обновлена!');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    } finally {
      setEditingPointSaving(false);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Настройки заведения</h1>

      {error && <div className="error-msg">{error}</div>}
      {success && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {success}
        </div>
      )}

      {/* Business info form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Основная информация</h2>
        <form onSubmit={handleSaveBusiness}>
          <div className="form-group">
            <label>Название заведения *</label>
            <input value={form.name} onChange={set('name')} placeholder="Название" required />
          </div>
          <div className="form-group">
            <label>Описание</label>
            <input value={form.description} onChange={set('description')} placeholder="Краткое описание" />
          </div>
          <div className="form-group">
            <label>Зона доставки</label>
            <input value={form.deliveryZone} onChange={set('deliveryZone')} placeholder="Например: Центральный район, в радиусе 5 км" />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </form>
      </div>

      {/* Trading points */}
      <div className="card">
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
          Торговые точки ({points.length})
        </h2>

        {points.length === 0 && (
          <p className="text-gray text-sm" style={{ marginBottom: '16px' }}>Нет торговых точек. Добавьте первую!</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {points.map(p => (
            <div key={p.id} className="card" style={{ padding: '12px' }}>
              {editingPointId === p.id ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Название</label>
                      <input value={editPointForm.name} onChange={e => setEditPointForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Адрес</label>
                      <input value={editPointForm.address} onChange={e => setEditPointForm(f => ({ ...f, address: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEditPoint(p.id)} disabled={editingPointSaving} className="btn-success" style={{ padding: '4px 10px', fontSize: '12px' }}>
                      {editingPointSaving ? '...' : 'Сохранить'}
                    </button>
                    <button onClick={cancelEditPoint} className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</p>
                    <p className="text-sm text-gray">{p.address}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                    <button onClick={() => startEditPoint(p)} className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }}>Изменить</button>
                    <button onClick={() => handleDeletePoint(p.id)} disabled={deletingPoint === p.id} className="btn-danger" style={{ padding: '4px 10px', fontSize: '12px' }}>
                      {deletingPoint === p.id ? '...' : 'Удалить'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Добавить точку</h3>
        <form onSubmit={handleAddPoint}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Название</label>
              <input value={pointForm.name} onChange={setPoint('name')} placeholder="Главный офис" required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Адрес</label>
              <input value={pointForm.address} onChange={setPoint('address')} placeholder="ул. Ленина, 1" required />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={addingPoint} style={{ marginTop: '12px' }}>
            {addingPoint ? 'Добавляем...' : '+ Добавить точку'}
          </button>
        </form>
      </div>
    </div>
  );
}
