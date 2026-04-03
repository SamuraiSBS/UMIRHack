import { useEffect, useState } from 'react';
import api from '../../api/client';

const STATUS_LABELS = {
  CREATED: ['badge-created', 'Создан — ждём курьера'],
  ACCEPTED: ['badge-accepted', 'Принят курьером'],
  DELIVERING: ['badge-delivering', 'В пути'],
  DONE: ['badge-done', 'Доставлен'],
};

function StatusBadge({ status }) {
  const [cls, label] = STATUS_LABELS[status] || ['badge-done', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/my')
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false));
  }, []);

  // Poll for status updates every 10 seconds while page is open
  useEffect(() => {
    const interval = setInterval(() => {
      api.get('/orders/my').then(r => setOrders(r.data)).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="page"><p>Загрузка заказов...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Мои заказы</h1>

      {orders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p className="text-gray">У вас пока нет заказов.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {orders.map(order => (
          <div key={order.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '15px' }}>{order.business?.name}</p>
                <p className="text-sm text-gray" style={{ marginTop: '2px' }}>
                  {new Date(order.createdAt).toLocaleString('ru-RU')}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <p className="text-sm" style={{ marginTop: '8px', color: '#374151' }}>
              <strong>Адрес:</strong> {order.address}
            </p>

            {order.courier && (
              <p className="text-sm" style={{ marginTop: '4px', color: '#374151' }}>
                <strong>Курьер:</strong> {order.courier.name || order.courier.email}
              </p>
            )}

            <div style={{ marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
              {order.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '3px' }}>
                  <span>{item.product.name} × {item.quantity}</span>
                  <span>{(item.product.price * item.quantity).toFixed(0)} ₽</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '6px', fontSize: '14px' }}>
                <span>Итого</span>
                <span>{order.totalPrice.toFixed(0)} ₽</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
