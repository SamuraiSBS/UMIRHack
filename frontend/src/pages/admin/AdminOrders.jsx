import { useEffect, useState } from 'react';
import api from '../../api/client';
import { asArray, formatCurrency, formatDate, shortId } from '../../lib/safeData';

const STATUS_LABELS = {
  CREATED: ['badge-created', 'Создан'],
  ACCEPTED: ['badge-accepted', 'Принят'],
  DELIVERING: ['badge-delivering', 'В пути'],
  DONE: ['badge-done', 'Выполнен'],
  CANCELLED: ['badge-cancelled', 'Отменён'],
};

function StatusBadge({ status }) {
  const [cls, label] = STATUS_LABELS[status] || ['badge-done', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/orders')
      .then(r => setOrders(asArray(r.data)))
      .catch(() => setError('Ошибка загрузки заказов'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Все заказы ({orders.length})</h1>

      {error && <div className="error-msg">{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {orders.map(order => (
          <div key={order?.id || formatDate(order?.createdAt)} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '14px' }}>{order?.business?.name || 'Заведение'}</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  #{shortId(order?.id)} · {formatDate(order?.createdAt)}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#6b7280' }}>Покупатель: </span>
                {order.customer?.name || order.customer?.email}
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Курьер: </span>
                {order.courier ? (order.courier.name || order.courier.email) : '—'}
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Адрес: </span>
                {order.address}
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Сумма: </span>
                <strong>{formatCurrency(order?.totalPrice)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
