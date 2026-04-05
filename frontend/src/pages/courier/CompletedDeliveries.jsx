import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { asArray, asNumber, formatCurrency, formatDate } from '../../lib/safeData';

export default function CompletedDeliveries() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/courier/orders')
      .then(r => setOrders(asArray(r.data).filter(o => o.status === 'DONE')))
      .catch(err => setError(err.response?.data?.error || 'Не удалось загрузить историю доставок'))
      .finally(() => setLoading(false));
  }, []);

  const totalEarned = orders.reduce((sum, o) => sum + asNumber(o?.deliveryFee), 0);

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page" style={{ maxWidth: '560px' }}>
      <button onClick={() => navigate('/courier/active')} className="btn-outline"
        style={{ marginBottom: '16px', fontSize: '13px' }}>← Назад</button>

      <h1 className="page-title">История доставок</h1>

      {error && <div className="error-msg">{error}</div>}

      {orders.length > 0 && (
        <div className="card" style={{ marginBottom: '16px', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <p style={{ fontWeight: 700, color: '#15803d' }}>
            Всего доставок: {orders.length} • Заработано: {totalEarned.toFixed(0)} ₽
          </p>
        </div>
      )}

      {orders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📭</p>
          <p className="text-gray">Выполненных доставок пока нет.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {orders.map(o => (
          <div key={o?.id || formatDate(o?.createdAt)} className="card" style={{ opacity: 0.9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>{o?.business?.name || 'Заведение'}</p>
                <p className="text-sm text-gray" style={{ marginTop: '2px' }}>{o.address}</p>
                {o.tradingPoint && (
                  <p className="text-sm text-gray" style={{ marginTop: '2px' }}>
                    Откуда: {o.tradingPoint.address}
                  </p>
                )}
                {o.distanceKm != null && (
                  <p className="text-sm text-gray" style={{ marginTop: '2px' }}>
                    Расстояние: {o.distanceKm} км
                  </p>
                )}
                <p className="text-sm text-gray" style={{ marginTop: '4px' }}>
                  {formatDate(o?.createdAt, 'ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                {o.deliveryFee != null && (
                  <p style={{ fontWeight: 700, fontSize: '16px', color: '#16a34a' }}>+{formatCurrency(o.deliveryFee).replace(' ₽', '')} ₽</p>
                )}
                <p style={{ fontSize: '12px', color: '#6b7280' }}>заказ {formatCurrency(o?.totalPrice)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
