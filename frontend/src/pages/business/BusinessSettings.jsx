import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import LeafletMap from '../../components/LeafletMap';
import { getCityConfig } from '../../lib/cities';
import { reverseGeocode } from '../../lib/map';

function resolveMapCenter(point, fallbackCenter) {
  if (point?.lat != null && point?.lng != null) {
    return [point.lat, point.lng];
  }
  return fallbackCenter;
}

export default function BusinessSettings() {
  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', deliveryZone: '' });
  const [points, setPoints] = useState([]);
  const [pointForm, setPointForm] = useState({ name: '', address: '', lat: null, lng: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingPoint, setAddingPoint] = useState(false);
  const [deletingPoint, setDeletingPoint] = useState(null);
  const [editingPointId, setEditingPointId] = useState(null);
  const [editPointForm, setEditPointForm] = useState({ name: '', address: '', lat: null, lng: null });
  const [editingPointSaving, setEditingPointSaving] = useState(false);
  const [resolvingAddPoint, setResolvingAddPoint] = useState(false);
  const [resolvingEditPoint, setResolvingEditPoint] = useState(false);
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

  const cityConfig = useMemo(
    () => getCityConfig(form.deliveryZone || business?.deliveryZone || ''),
    [business?.deliveryZone, form.deliveryZone]
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPoint = (k) => (e) => setPointForm((f) => ({ ...f, [k]: e.target.value }));

  async function syncPointFromMap(setter, setResolving, point) {
    setResolving(true);
    setError('');
    setter((prev) => ({ ...prev, lat: point.lat, lng: point.lng }));
    try {
      const result = await reverseGeocode(point.lat, point.lng);
      const nextAddress = result.display_name || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
      setter((prev) => ({
        ...prev,
        address: nextAddress,
        lat: point.lat,
        lng: point.lng,
      }));
    } catch {
      setter((prev) => ({
        ...prev,
        address: prev.address || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
        lat: point.lat,
        lng: point.lng,
      }));
      setError('Не удалось определить адрес автоматически. Точка на карте сохранена, адрес можно поправить вручную.');
    } finally {
      setResolving(false);
    }
  }

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
    if (!pointForm.name || !pointForm.address) {
      setError('Название и адрес обязательны');
      return;
    }
    if (pointForm.lat == null || pointForm.lng == null) {
      setError('Выберите точку на карте');
      return;
    }
    setError('');
    setAddingPoint(true);
    try {
      const res = await api.post('/business/my/trading-points', pointForm);
      setPoints((prev) => [...prev, res.data]);
      setPointForm({ name: '', address: '', lat: null, lng: null });
      setSuccess('Точка добавлена!');
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
      setPoints((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    } finally {
      setDeletingPoint(null);
    }
  }

  function startEditPoint(point) {
    setEditingPointId(point.id);
    setEditPointForm({
      name: point.name,
      address: point.address,
      lat: point.lat,
      lng: point.lng,
    });
    setError('');
  }

  function cancelEditPoint() {
    setEditingPointId(null);
    setEditPointForm({ name: '', address: '', lat: null, lng: null });
  }

  async function handleEditPoint(id) {
    if (!editPointForm.name || !editPointForm.address) {
      setError('Название и адрес обязательны');
      return;
    }
    if (editPointForm.lat == null || editPointForm.lng == null) {
      setError('Выберите точку на карте');
      return;
    }
    setError('');
    setEditingPointSaving(true);
    try {
      const res = await api.patch(`/business/my/trading-points/${id}`, editPointForm);
      setPoints((prev) => prev.map((p) => (p.id === id ? res.data : p)));
      setEditingPointId(null);
      setEditPointForm({ name: '', address: '', lat: null, lng: null });
      setSuccess('Точка обновлена!');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    } finally {
      setEditingPointSaving(false);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  const addPointMarker = pointForm.lat != null && pointForm.lng != null ? { lat: pointForm.lat, lng: pointForm.lng } : null;

  return (
    <div className="page">
      <h1 className="page-title">Настройки заведения</h1>

      {error && <div className="error-msg">{error}</div>}
      {success && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {success}
        </div>
      )}

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
            <input value={form.deliveryZone} onChange={set('deliveryZone')} placeholder="Например: Ростов-на-Дону" />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
          Торговые точки ({points.length})
        </h2>

        {points.length === 0 && (
          <p className="text-gray text-sm" style={{ marginBottom: '16px' }}>Нет торговых точек. Добавьте первую!</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {points.map((p) => {
            const editPointMarker = editPointForm.lat != null && editPointForm.lng != null
              ? { lat: editPointForm.lat, lng: editPointForm.lng }
              : null;

            return (
              <div key={p.id} className="card" style={{ padding: '12px' }}>
                {editingPointId === p.id ? (
                  <div>
                    <div className="form-group">
                      <label>Название</label>
                      <input value={editPointForm.name} onChange={(e) => setEditPointForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Точка на карте</label>
                      <LeafletMap
                        center={resolveMapCenter(editPointMarker, resolveMapCenter(p, cityConfig.center))}
                        zoom={editPointMarker ? 15 : cityConfig.zoom}
                        onMapClick={(point) => syncPointFromMap(setEditPointForm, setResolvingEditPoint, point)}
                        origin={editPointMarker}
                        height={220}
                      />
                    </div>
                    <div className="form-group">
                      <label>Выбранный адрес</label>
                      <input value={editPointForm.address} onChange={(e) => setEditPointForm((f) => ({ ...f, address: e.target.value }))} />
                    </div>
                    <p className="text-sm text-gray" style={{ marginBottom: '10px', marginTop: '-4px' }}>
                      Нажмите на карту, чтобы обновить точку бизнеса.
                      {resolvingEditPoint ? ' Обновляем адрес...' : ''}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditPoint(p.id)} disabled={editingPointSaving} className="btn-success" style={{ padding: '4px 10px', fontSize: '12px' }}>
                        {editingPointSaving ? '...' : 'Сохранить'}
                      </button>
                      <button onClick={cancelEditPoint} className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }}>Отмена</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</p>
                      <p className="text-sm text-gray">{p.address}</p>
                      {p.lat != null && p.lng != null && (
                        <p className="text-sm text-gray">Координаты: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => startEditPoint(p)} className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }}>Изменить</button>
                      <button onClick={() => handleDeletePoint(p.id)} disabled={deletingPoint === p.id} className="btn-danger" style={{ padding: '4px 10px', fontSize: '12px' }}>
                        {deletingPoint === p.id ? '...' : 'Удалить'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Добавить точку</h3>
        <form onSubmit={handleAddPoint}>
          <div className="form-group">
            <label>Название</label>
            <input value={pointForm.name} onChange={setPoint('name')} placeholder="Главный офис" required />
          </div>
          <div className="form-group">
            <label>Точка на карте</label>
            <LeafletMap
              center={resolveMapCenter(addPointMarker, cityConfig.center)}
              zoom={addPointMarker ? 15 : cityConfig.zoom}
              onMapClick={(point) => syncPointFromMap(setPointForm, setResolvingAddPoint, point)}
              origin={addPointMarker}
              height={240}
            />
          </div>
          <div className="form-group">
            <label>Выбранный адрес</label>
            <input
              value={pointForm.address}
              onChange={setPoint('address')}
              placeholder="Нажмите на карту, чтобы выбрать точку"
              required
            />
          </div>
          <p className="text-sm text-gray" style={{ marginBottom: '12px', marginTop: '-4px' }}>
            Нажмите на карту, чтобы сохранить точное место бизнеса.
            {resolvingAddPoint ? ' Обновляем адрес...' : ''}
          </p>
          <button type="submit" className="btn-primary" disabled={addingPoint} style={{ marginTop: '12px' }}>
            {addingPoint ? 'Добавляем...' : '+ Добавить точку'}
          </button>
        </form>
      </div>
    </div>
  );
}
