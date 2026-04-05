import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import { asArray, asNumber, formatCurrency, formatDate, shortId } from '../../lib/safeData';

const STATUS_LABELS = {
  CREATED: ['badge-created', 'Ожидает курьера'],
  ACCEPTED: ['badge-accepted', 'Курьер принял'],
  DELIVERING: ['badge-delivering', 'Доставляется'],
  DONE: ['badge-done', 'Выполнен'],
  CANCELLED: ['badge-cancelled', 'Отменён'],
  REJECTED: ['badge-danger', 'Отклонён'],
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
  const [filter, setFilter] = useState('ALL');

  // Business creation form state
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  function loadAll() {
    return api.get('/business/my')
      .then(r => {
        setBusiness(r.data);
        return api.get('/business/my/orders').then(or => setOrders(asArray(or.data)));
      })
      .catch(err => {
        if (err.response?.status === 404) setNeedCreate(true);
        else setError(err.response?.data?.error || 'Не удалось загрузить заказы');
      });
  }

  async function handleReject(orderId) {
    if (!confirm('Отклонить этот заказ?')) return;
    try {
      await api.post(`/business/my/orders/${orderId}/reject`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'REJECTED' } : o));
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка отклонения');
    }
  }

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, []);

  // Auto-refresh orders every 15 seconds
  useEffect(() => {
    if (!business) return;
    const interval = setInterval(() => {
      api.get('/business/my/orders').then(r => setOrders(asArray(r.data))).catch(() => {});
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
    REJECTED: orders.filter(o => o.status === 'REJECTED').length,
  };

  const filteredOrders = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{business?.name}</h1>
        <Link to="/business/products">
          <button className="btn-outline" style={{ fontSize: '13px' }}>Управление меню →</button>
        </Link>
      </div>

      {/* Stats row — clickable filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'Все', count: orders.length, color: '#1f2937', status: 'ALL' },
          { label: 'Новые', count: counts.CREATED, color: '#1e3a5f', status: 'CREATED' },
          { label: 'Приняты', count: counts.ACCEPTED, color: '#3b2800', status: 'ACCEPTED' },
          { label: 'В доставке', count: counts.DELIVERING, color: '#052e16', status: 'DELIVERING' },
          { label: 'Выполнены', count: counts.DONE, color: '#1f2937', status: 'DONE' },
          { label: 'Отклонены', count: counts.REJECTED, color: '#3b0a0a', status: 'REJECTED' },
        ].map(({ label, count, color, status }) => (
          <div
            key={label}
            className="card"
            onClick={() => setFilter(status)}
            style={{
              background: color,
              textAlign: 'center',
              padding: '12px',
              cursor: 'pointer',
              outline: filter === status ? '2px solid #2563eb' : 'none',
              transition: 'outline 0.1s',
            }}
          >
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>{count}</p>
            <p style={{ fontSize: '12px', color: '#9E9E9E' }}>{label}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '12px' }}>
        Заказы ({filteredOrders.length}{filter !== 'ALL' ? ` из ${orders.length}` : ''})
      </h2>

      {filteredOrders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <p className="text-gray">{filter === 'ALL' ? 'Заказов пока нет.' : 'Нет заказов с таким статусом.'}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredOrders.map(order => (
          <div key={order.id} className="card">
            {(() => {
              const items = asArray(order?.items);
              const totalPrice = asNumber(order?.totalPrice);
              return (
                <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p style={{ fontWeight: 700 }}>#{shortId(order?.id)}</p>
                <p className="text-sm text-gray">{formatDate(order?.createdAt)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StatusBadge status={order.status} />
                <p style={{ fontWeight: 700, marginTop: '4px' }}>{formatCurrency(totalPrice)}</p>
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

            {order.status === 'CREATED' && (
              <div style={{ marginTop: '8px' }}>
                <button
                  onClick={() => handleReject(order.id)}
                  className="btn-danger"
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                >
                  Отклонить заказ
                </button>
              </div>
            )}

            <div style={{ marginTop: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
              {items.map((item, index) => (
                <span key={item?.id || `${order.id}-${index}`} style={{ fontSize: '12px', color: '#6b7280', marginRight: '10px' }}>
                  {item?.product?.name || 'Товар'} ×{item?.quantity || 0}
                </span>
              ))}
            </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
