import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

const STATUS_LABELS = {
  CREATED: ['badge-created', 'Ожидает курьера'],
  ACCEPTED: ['badge-accepted', 'Курьер принял'],
  DELIVERING: ['badge-delivering', 'Доставляется'],
  DONE: ['badge-done', 'Выполнен'],
};

function StatusBadge({ status }) {
  const [cls, label] = STATUS_LABELS[status] || ['badge-done', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needCreate, setNeedCreate] = useState(false);

  // Business creation form state
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  function loadAll() {
    return api.get('/business/my')
      .then(r => {
        setBusiness(r.data);
        return api.get('/business/my/orders').then(or => setOrders(or.data));
      })
      .catch(err => {
        if (err.response?.status === 404) setNeedCreate(true);
      });
  }

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, []);

  // Auto-refresh orders every 15 seconds
  useEffect(() => {
    if (!business) return;
    const interval = setInterval(() => {
      api.get('/business/my/orders').then(r => setOrders(r.data)).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [business]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const { data } = await api.post('/business', form);
      setBusiness(data);
      setNeedCreate(false);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  // No business yet — show creation form
  if (needCreate) {
    return (
      <div className="page" style={{ maxWidth: '480px' }}>
        <h1 className="page-title">Создать заведение</h1>
        <div className="card">
          {createError && <div className="error-msg">{createError}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Название</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Пицца Экспресс" />
            </div>
            <div className="form-group">
              <label>Описание</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Лучшая пицца в городе" rows={3} style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={creating}>
              {creating ? 'Создаём...' : 'Создать заведение'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const counts = {
    CREATED: orders.filter(o => o.status === 'CREATED').length,
    ACCEPTED: orders.filter(o => o.status === 'ACCEPTED').length,
    DELIVERING: orders.filter(o => o.status === 'DELIVERING').length,
    DONE: orders.filter(o => o.status === 'DONE').length,
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{business?.name}</h1>
        <Link to="/business/products">
          <button className="btn-outline" style={{ fontSize: '13px' }}>Управление меню →</button>
        </Link>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'Новые', count: counts.CREATED, color: '#dbeafe' },
          { label: 'Приняты', count: counts.ACCEPTED, color: '#fef3c7' },
          { label: 'В доставке', count: counts.DELIVERING, color: '#d1fae5' },
          { label: 'Выполнены', count: counts.DONE, color: '#f3f4f6' },
        ].map(({ label, count, color }) => (
          <div key={label} className="card" style={{ background: color, textAlign: 'center', padding: '12px' }}>
            <p style={{ fontSize: '28px', fontWeight: 700 }}>{count}</p>
            <p style={{ fontSize: '12px', color: '#374151' }}>{label}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '12px' }}>
        Заказы ({orders.length})
      </h2>

      {orders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <p className="text-gray">Заказов пока нет.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {orders.map(order => (
          <div key={order.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p style={{ fontWeight: 700 }}>#{order.id.slice(-6).toUpperCase()}</p>
                <p className="text-sm text-gray">{new Date(order.createdAt).toLocaleString('ru-RU')}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StatusBadge status={order.status} />
                <p style={{ fontWeight: 700, marginTop: '4px' }}>{order.totalPrice.toFixed(0)} ₽</p>
              </div>
            </div>

            <p className="text-sm" style={{ marginTop: '8px' }}>
              <strong>Клиент:</strong> {order.customer?.name || order.customer?.email}
            </p>
            <p className="text-sm" style={{ marginTop: '2px' }}>
              <strong>Адрес:</strong> {order.address}
            </p>
            {order.courier && (
              <p className="text-sm" style={{ marginTop: '2px' }}>
                <strong>Курьер:</strong> {order.courier?.name || order.courier?.email}
              </p>
            )}

            <div style={{ marginTop: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
              {order.items.map(item => (
                <span key={item.id} style={{ fontSize: '12px', color: '#6b7280', marginRight: '10px' }}>
                  {item.product.name} ×{item.quantity}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
