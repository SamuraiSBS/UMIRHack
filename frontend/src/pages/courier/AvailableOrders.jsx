import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { asArray, formatCurrency, shortId } from '../../lib/safeData';

export default function AvailableOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null); // orderId being accepted
  const [error, setError] = useState('');
  const [shiftCity, setShiftCity] = useState('');
  const navigate = useNavigate();

  function load() {
    return Promise.all([
      api.get('/orders/available'),
      api.get('/courier/shift').catch(() => null),
    ])
      .then(([ordersRes, shiftRes]) => {
        setOrders(asArray(ordersRes.data));
        if (shiftRes) setShiftCity(shiftRes.data.city || '');
      })
      .catch(err => setError(err.response?.data?.error || 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // Auto-refresh every 8 seconds
  useEffect(() => {
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  async function handleAccept(orderId) {
    setAccepting(orderId);
    setError('');
    try {
      await api.post(`/orders/${orderId}/accept`);
      navigate('/courier/active');
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось принять заказ');
      setAccepting(null);
      load(); // refresh list
    }
  }

  if (loading) return <div className="page"><p>Загрузка заказов...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Доступные заказы</h1>
      {shiftCity && <p className="text-sm text-gray" style={{ marginBottom: '12px' }}>Подборка по городу: {shiftCity}</p>}

      {error && <div className="error-msg">{error}</div>}

      {orders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📭</p>
          <p className="text-gray">Пока нет доступных заказов. Обновляем каждые 8 сек...</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {orders.map(order => {
          const items = asArray(order?.items);
          const itemCount = items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
          const businessName = order?.business?.name || 'Заведение';

          // Count total items
          return (
            <div key={order?.id || businessName} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '15px' }}>{businessName}</p>

                  {/* Show limited info before accepting */}
                  <p className="text-sm text-gray" style={{ marginTop: '4px' }}>
                    {itemCount} товар(ов) • {formatCurrency(order?.totalPrice)}
                  </p>

                  <p className="text-sm" style={{ marginTop: '6px', color: '#374151' }}>
                    <strong>Откуда:</strong>{' '}
                    {order?.tradingPoint ? `${order.tradingPoint.name} — ${order.tradingPoint.address}` : businessName}
                  </p>

                  {order.distanceKm != null && (
                    <p className="text-sm text-gray" style={{ marginTop: '2px' }}>
                      Расстояние: {order.distanceKm} км
                    </p>
                  )}

                  <p className="text-sm text-gray" style={{ marginTop: '2px' }}>
                    Заказ #{shortId(order?.id)}
                  </p>

                  {order.city && (
                    <p className="text-sm text-gray" style={{ marginTop: '2px' }}>
                      Город клиента: {order.city}
                    </p>
                  )}

                  {/* Composition summary */}
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                    {items.slice(0, 3).map((item, i) => (
                      <span key={`${order?.id || 'order'}-${i}`}>{item?.product?.name || 'Товар'} ×{item?.quantity || 0}{i < Math.min(items.length, 3) - 1 ? ', ' : ''}</span>
                    ))}
                    {items.length > 3 && <span> и ещё {items.length - 3}...</span>}
                  </div>
                </div>

                <div style={{ marginLeft: '12px', textAlign: 'right', flexShrink: 0 }}>
                  {order.deliveryFee != null ? (
                    <p style={{ fontWeight: 700, fontSize: '18px', color: '#16a34a', marginBottom: '4px' }}>
                      +{formatCurrency(order.deliveryFee).replace(' ₽', '')} ₽
                    </p>
                  ) : null}
                  <p style={{ fontWeight: order.deliveryFee != null ? 400 : 700, fontSize: order.deliveryFee != null ? '12px' : '18px', color: order.deliveryFee != null ? '#6b7280' : '#16a34a', marginBottom: '8px' }}>
                    {order.deliveryFee != null ? `заказ ${formatCurrency(order?.totalPrice)}` : `${formatCurrency(order?.totalPrice)}`}
                  </p>
                  <button
                    className="btn-primary"
                    disabled={accepting === order?.id || !order?.id}
                    onClick={() => handleAccept(order.id)}
                    style={{ fontSize: '13px', padding: '8px 16px' }}
                  >
                    {accepting === order?.id ? '...' : 'Принять'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
