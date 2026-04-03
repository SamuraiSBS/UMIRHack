import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

const STATUS_LABELS = {
  CREATED: 'Новые',
  ACCEPTED: 'Принятые',
  DELIVERING: 'В доставке',
  DONE: 'Выполненные',
  CANCELLED: 'Отменённые',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => setError('Ошибка загрузки статистики'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Панель модератора</h1>

      {error && <div className="error-msg">{error}</div>}

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Пользователей', value: stats.users, color: '#2563eb' },
              { label: 'Заведений', value: stats.businesses, color: '#7c3aed' },
              { label: 'Заказов всего', value: stats.orders, color: '#0891b2' },
              { label: 'Курьеров на смене', value: stats.activeShifts, color: '#16a34a' },
            ].map(card => (
              <div key={card.label} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '32px', fontWeight: 700, color: card.color }}>{card.value}</p>
                <p className="text-sm text-gray">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Заказы по статусам</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(stats.ordersByStatus || {}).map(([status, count]) => (
                <div key={status} style={{ background: '#f3f4f6', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: '18px' }}>{count}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>{STATUS_LABELS[status] || status}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        <Link to="/admin/users">
          <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            <p style={{ fontSize: '28px', marginBottom: '8px' }}>👥</p>
            <p style={{ fontWeight: 700 }}>Пользователи</p>
            <p className="text-sm text-gray">Управление аккаунтами</p>
          </div>
        </Link>
        <Link to="/admin/businesses">
          <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            <p style={{ fontSize: '28px', marginBottom: '8px' }}>🏪</p>
            <p style={{ fontWeight: 700 }}>Заведения</p>
            <p className="text-sm text-gray">Модерация заведений</p>
          </div>
        </Link>
        <Link to="/admin/orders">
          <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            <p style={{ fontSize: '28px', marginBottom: '8px' }}>📦</p>
            <p style={{ fontWeight: 700 }}>Заказы</p>
            <p className="text-sm text-gray">Просмотр всех заказов</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
