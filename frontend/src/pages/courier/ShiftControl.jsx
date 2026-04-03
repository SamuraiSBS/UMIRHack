import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

export default function ShiftControl() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/courier/shift'),
      api.get('/courier/orders'),
    ]).then(([shiftRes, ordersRes]) => {
      setIsActive(shiftRes.data.isActive);
      // Find current active order (ACCEPTED or DELIVERING)
      const active = ordersRes.data.find(o => o.status === 'ACCEPTED' || o.status === 'DELIVERING');
      setActiveOrder(active || null);
    }).finally(() => setLoading(false));
  }, []);

  async function toggleShift() {
    setToggling(true);
    try {
      if (isActive) {
        await api.post('/courier/shift/stop');
        setIsActive(false);
      } else {
        await api.post('/courier/shift/start');
        setIsActive(true);
      }
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page" style={{ maxWidth: '480px' }}>
      <h1 className="page-title">Панель курьера</h1>

      <p style={{ fontSize: '15px', color: '#374151', marginBottom: '20px' }}>
        Привет, <strong>{user?.name || user?.email}</strong>!
      </p>

      {/* Shift status card */}
      <div className="card" style={{ textAlign: 'center', padding: '32px 16px', marginBottom: '16px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 16px',
          background: isActive ? '#d1fae5' : '#f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px'
        }}>
          {isActive ? '🟢' : '⚪'}
        </div>

        <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
          {isActive ? 'Смена активна' : 'Смена завершена'}
        </p>
        <p className="text-gray text-sm" style={{ marginBottom: '20px' }}>
          {isActive ? 'Вы принимаете заказы' : 'Начните смену чтобы принимать заказы'}
        </p>

        <button
          onClick={toggleShift}
          disabled={toggling}
          className={isActive ? 'btn-danger' : 'btn-success'}
          style={{ padding: '10px 32px', fontSize: '15px' }}
        >
          {toggling ? '...' : isActive ? 'Завершить смену' : 'Начать смену'}
        </button>
      </div>

      {/* Active order hint */}
      {activeOrder && (
        <div className="card" style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', marginBottom: '16px' }}>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>У вас активный заказ</p>
          <p className="text-sm text-gray">Адрес: {activeOrder.address}</p>
          <Link to="/courier/active">
            <button className="btn-primary" style={{ marginTop: '10px', padding: '6px 16px', fontSize: '13px' }}>
              Перейти к заказу →
            </button>
          </Link>
        </div>
      )}

      {/* Navigation */}
      {isActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link to="/courier/orders">
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
              <div>
                <p style={{ fontWeight: 600 }}>Доступные заказы</p>
                <p className="text-sm text-gray">Просмотреть и принять заказы</p>
              </div>
              <span style={{ fontSize: '20px' }}>📦</span>
            </div>
          </Link>

          <Link to="/courier/active">
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
              <div>
                <p style={{ fontWeight: 600 }}>Мой заказ</p>
                <p className="text-sm text-gray">Текущая доставка</p>
              </div>
              <span style={{ fontSize: '20px' }}>🚴</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
