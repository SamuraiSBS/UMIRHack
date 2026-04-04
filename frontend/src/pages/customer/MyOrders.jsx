import { useEffect, useState } from 'react';
import api from '../../api/client';
import LeafletMap from '../../components/LeafletMap';
import { fetchRoute } from '../../lib/map';

const STATUS_LABELS = {
  CREATED:    ['#1e3a5f', '#60a5fa', 'Создан — ждём курьера'],
  ACCEPTED:   ['#3d2e00', '#fbbf24', 'Принят курьером'],
  DELIVERING: ['#064e3b', '#34d399', 'В пути'],
  DONE:       ['#2A2A2A', '#9E9E9E', 'Доставлен'],
  CANCELLED:  ['#3b0a0a', '#f87171', 'Отменён'],
  REJECTED:   ['#3b0a0a', '#f87171', 'Отклонён'],
};

function StatusBadge({ status }) {
  const [bg, color, label] = STATUS_LABELS[status] || ['#2A2A2A', '#9E9E9E', status];
  return (
    <span style={{
      background: bg, color,
      borderRadius: '999px', padding: '3px 12px',
      fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

const ACTIVE_STATUSES = new Set(['CREATED', 'ACCEPTED', 'DELIVERING']);
const DONE_STATUSES = new Set(['DONE', 'CANCELLED', 'REJECTED']);

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  function load() {
    return api.get('/orders/my').then(r => setOrders(r.data)).catch(() => {});
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);
  useEffect(() => {
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleCancel(orderId) {
    if (!confirm('Отменить заказ?')) return;
    setCancelling(orderId);
    setError('');
    try {
      await api.post(`/orders/${orderId}/cancel`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось отменить заказ');
    } finally {
      setCancelling(null);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9E9E9E', fontSize: '16px' }}>
      Загрузка заказов...
    </div>
  );

  const filtered = orders.filter(o => {
    if (filter === 'active') return ACTIVE_STATUSES.has(o.status);
    if (filter === 'done') return DONE_STATUSES.has(o.status);
    return true;
  });
  const activeCount = orders.filter(o => ACTIVE_STATUSES.has(o.status)).length;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 20px 80px' }}>
      <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', marginBottom: '20px' }}>Мои заказы</h1>

      {error && <div className="error-msg">{error}</div>}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { key: 'all', label: 'Все' },
          { key: 'active', label: activeCount ? `Активные (${activeCount})` : 'Активные' },
          { key: 'done', label: 'Завершённые' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              background: filter === tab.key ? '#FFD600' : '#2A2A2A',
              color: filter === tab.key ? '#1C1C1C' : '#CCCCCC',
              border: '1px solid ' + (filter === tab.key ? '#FFD600' : '#3A3A3A'),
              borderRadius: '20px',
              padding: '8px 18px',
              fontSize: '14px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#2A2A2A', borderRadius: '16px',
          color: '#9E9E9E', fontSize: '15px',
        }}>
          {orders.length === 0 ? 'У вас пока нет заказов.' : 'Нет заказов в этой категории.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map(order => (
          <div key={order.id} style={{
            background: '#2A2A2A', borderRadius: '16px', overflow: 'hidden',
          }}>
            {/* Order header */}
            <div style={{
              padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              flexWrap: 'wrap', gap: '8px',
              borderBottom: '1px solid #3A3A3A',
            }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '16px', color: '#FFFFFF', marginBottom: '3px' }}>
                  {order.business?.name}
                </p>
                <p style={{ fontSize: '12px', color: '#6B6B6B' }}>
                  {new Date(order.createdAt).toLocaleString('ru-RU')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusBadge status={order.status} />
                {order.status === 'CREATED' && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancelling === order.id}
                    style={{
                      background: '#3b0a0a', color: '#f87171',
                      border: 'none', borderRadius: '8px',
                      padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >{cancelling === order.id ? '...' : 'Отменить'}</button>
                )}
              </div>
            </div>

            {/* Order body */}
            <div style={{ padding: '14px 20px' }}>
              <p style={{ fontSize: '13px', color: '#9E9E9E', marginBottom: '6px' }}>
                📍 {order.address}
              </p>
              {order.courier && (
                <p style={{ fontSize: '13px', color: '#9E9E9E', marginBottom: '8px' }}>
                  🛵 Курьер: {order.courier.name || order.courier.email}
                </p>
              )}

              {/* Items */}
              <div style={{ marginTop: '8px' }}>
                {order.items.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '13px', color: '#CCCCCC', marginBottom: '4px',
                  }}>
                    <span>{item.product.name} × {item.quantity}</span>
                    <span>{(item.product.price * item.quantity).toFixed(0)} ₽</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontWeight: 700, fontSize: '15px', color: '#FFFFFF',
                  marginTop: '10px', paddingTop: '10px',
                  borderTop: '1px solid #3A3A3A',
                }}>
                  <span>Итого</span>
                  <span>{order.totalPrice.toFixed(0)} ₽</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
