import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const STATUS_LABELS = {
  ACCEPTED: 'Принят — едете к точке выдачи',
  DELIVERING: 'В пути к клиенту',
  DONE: 'Доставлен',
};

const NEXT_STATUS = {
  ACCEPTED: { status: 'DELIVERING', label: 'Забрал заказ — везу клиенту' },
  DELIVERING: { status: 'DONE', label: 'Доставил заказ' },
};

export default function ActiveOrder() {
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]); // completed orders
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function load() {
    return api.get('/courier/orders').then(r => {
      const active = r.data.find(o => o.status === 'ACCEPTED' || o.status === 'DELIVERING');
      const done = r.data.filter(o => o.status === 'DONE');
      setOrder(active || null);
      setHistory(done);
    });
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function updateStatus() {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setUpdating(true);
    setError('');
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next.status });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления статуса');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page" style={{ maxWidth: '560px' }}>
      <h1 className="page-title">Мой заказ</h1>

      {error && <div className="error-msg">{error}</div>}

      {!order ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', marginBottom: '16px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>✅</p>
          <p className="text-gray">Нет активного заказа.</p>
          <button className="btn-primary" style={{ marginTop: '16px' }}
            onClick={() => navigate('/courier/orders')}>
            Смотреть доступные заказы
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '16px' }}>
          {/* Status */}
          <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
            <p style={{ fontWeight: 700, color: '#1d4ed8' }}>{STATUS_LABELS[order.status]}</p>
          </div>

          {/* Business */}
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Ресторан / магазин</p>
          <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '12px' }}>{order.business.name}</p>

          {/* Delivery address — shown only after accepting */}
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Адрес доставки</p>
          <p style={{ fontWeight: 600, marginBottom: '12px', color: '#111827' }}>{order.address}</p>

          {/* Customer contact */}
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Клиент</p>
          <p style={{ marginBottom: '12px' }}>{order.customer?.name || order.customer?.email}</p>

          {/* Order items */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginBottom: '14px' }}>
            {order.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span>{item.product.name} × {item.quantity}</span>
                <span>{(item.product.price * item.quantity).toFixed(0)} ₽</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '6px' }}>
              <span>Итого</span>
              <span>{order.totalPrice.toFixed(0)} ₽</span>
            </div>
          </div>

          {/* Action button */}
          {NEXT_STATUS[order.status] && (
            <button
              className="btn-success w-full"
              style={{ padding: '12px', fontSize: '15px' }}
              disabled={updating}
              onClick={updateStatus}
            >
              {updating ? 'Обновляем...' : NEXT_STATUS[order.status].label}
            </button>
          )}
        </div>
      )}

      {/* Completed orders history */}
      {history.length > 0 && (
        <>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '16px 0 10px' }}>Выполненные сегодня</h2>
          {history.map(o => (
            <div key={o.id} className="card" style={{ marginBottom: '8px', opacity: 0.8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{o.business.name}</span>
                <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 700 }}>{o.totalPrice.toFixed(0)} ₽</span>
              </div>
              <p className="text-sm text-gray" style={{ marginTop: '2px' }}>{o.address}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
