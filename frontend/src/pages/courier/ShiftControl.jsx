import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import { CITY_OPTIONS } from '../../lib/cities';
import { asArray } from '../../lib/safeData';

export default function ShiftControl() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [city, setCity] = useState(CITY_OPTIONS[0].value);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [savingCity, setSavingCity] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/courier/shift'),
      api.get('/courier/orders'),
    ]).then(([shiftRes, ordersRes]) => {
      setIsActive(shiftRes.data.isActive);
      if (shiftRes.data.city) setCity(shiftRes.data.city);
      // Find current active order (ACCEPTED or DELIVERING)
      const active = asArray(ordersRes.data).find(o => o.status === 'ACCEPTED' || o.status === 'DELIVERING');
      setActiveOrder(active || null);
    }).catch((err) => {
      setError(err.response?.data?.error || 'Не удалось загрузить панель курьера');
    }).finally(() => setLoading(false));
  }, []);

  async function toggleShift() {
    setToggling(true);
    setError('');
    try {
      if (isActive) {
        await api.post('/courier/shift/stop');
        setIsActive(false);
      } else {
        await api.post('/courier/shift/start', { city });
        setIsActive(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось обновить смену');
    } finally {
      setToggling(false);
    }
  }

  async function saveCity() {
    setSavingCity(true);
    setError('');
    try {
      await api.patch('/courier/city', { city });
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось сохранить город');
    } finally {
      setSavingCity(false);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page" style={{ maxWidth: '480px' }}>
      <h1 className="page-title">Панель курьера</h1>

      <p style={{ fontSize: '15px', color: '#374151', marginBottom: '20px' }}>
        Привет, <strong>{user?.name || user?.email}</strong>!
      </p>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label>Город работы</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {CITY_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.value}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-outline" onClick={saveCity} disabled={savingCity}>
            {savingCity ? 'Сохраняем...' : 'Сохранить город'}
          </button>
          <p className="text-sm text-gray">
            Город запоминается и не сбрасывается после завершения смены.
          </p>
        </div>
      </div>

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
          {isActive ? `Вы принимаете заказы в городе ${city}` : `Начните смену в городе ${city}`}
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
