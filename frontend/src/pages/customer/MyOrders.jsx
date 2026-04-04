import { useEffect, useState } from 'react';
import api from '../../api/client';
import LeafletMap from '../../components/LeafletMap';
import { fetchRoute } from '../../lib/map';

const STATUS_LABELS = {
  CREATED: ['badge-created', 'Создан — ждём курьера'],
  ACCEPTED: ['badge-accepted', 'Принят курьером'],
  DELIVERING: ['badge-delivering', 'В пути'],
  DONE: ['badge-done', 'Доставлен'],
  CANCELLED: ['badge-cancelled', 'Отменён'],
};

function StatusBadge({ status }) {
  const [cls, label] = STATUS_LABELS[status] || ['badge-done', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function OrderTrackingMap({ order }) {
  const [route, setRoute] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      if (order.courierLat == null || order.courierLng == null || order.deliveryLat == null || order.deliveryLng == null) {
        setRoute(null);
        return;
      }

      try {
        const result = await fetchRoute(
          { lat: order.courierLat, lng: order.courierLng },
          { lat: order.deliveryLat, lng: order.deliveryLng }
        );
        if (!cancelled) setRoute(result);
      } catch {
        if (!cancelled) setRoute(null);
      }
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [order.courierLat, order.courierLng, order.deliveryLat, order.deliveryLng]);

  return (
    <div style={{ marginTop: '14px' }}>
      <div className="tracking-summary">
        <div>
          <strong>Курьер на карте</strong>
          <p className="text-sm text-gray">
            {order.courierLat != null && order.courierLng != null
              ? 'Текущее местоположение и маршрут обновляются автоматически.'
              : 'Ждём первую геопозицию от курьера.'}
          </p>
        </div>
        {route && (
          <div style={{ textAlign: 'right' }}>
            <strong>~{Math.max(5, Math.round(route.durationMin))} мин</strong>
            <p className="text-sm text-gray">{route.distanceKm.toFixed(1)} км</p>
          </div>
        )}
      </div>

      <LeafletMap
        center={[order.deliveryLat, order.deliveryLng]}
        zoom={13}
        interactive={false}
        destination={{ lat: order.deliveryLat, lng: order.deliveryLng }}
        courier={order.courierLat != null && order.courierLng != null ? { lat: order.courierLat, lng: order.courierLng } : null}
        route={route?.coordinates}
        height={300}
      />
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState('');

  function load() {
    return api.get('/orders/my')
      .then(r => setOrders(r.data))
      .catch(() => {});
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  // Poll for status updates every 10 seconds while page is open
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

  if (loading) return <div className="page"><p>Загрузка заказов...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Мои заказы</h1>

      {error && <div className="error-msg">{error}</div>}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusBadge status={order.status} />
                {order.status === 'CREATED' && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancelling === order.id}
                    className="btn-danger"
                    style={{ padding: '3px 10px', fontSize: '12px' }}
                  >
                    {cancelling === order.id ? '...' : 'Отменить'}
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm" style={{ marginTop: '8px', color: '#374151' }}>
              <strong>Адрес:</strong> {order.address}
            </p>

            {order.courier && (
              <p className="text-sm" style={{ marginTop: '4px', color: '#374151' }}>
                <strong>Курьер:</strong> {order.courier.name || order.courier.email}
              </p>
            )}

            {(order.status === 'ACCEPTED' || order.status === 'DELIVERING' || order.status === 'DONE') &&
              order.deliveryLat != null &&
              order.deliveryLng != null && (
                <OrderTrackingMap order={order} />
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
