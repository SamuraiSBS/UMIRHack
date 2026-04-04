import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function BusinessStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/business/my/stats')
      .then(r => setStats(r.data))
      .catch(() => setError('Не удалось загрузить статистику'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Загрузка...</p></div>;
  if (error) return <div className="page"><div className="error-msg">{error}</div></div>;

  return (
    <div className="page">
      <h1 className="page-title">Аналитика</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Всего заказов', value: stats.totalOrders, color: '#dbeafe' },
          { label: 'Выполнено', value: stats.doneOrders, color: '#d1fae5' },
          { label: 'Выручка', value: `${stats.revenue.toFixed(0)} ₽`, color: '#fef3c7' },
          { label: 'Средний чек', value: `${stats.avgCheck.toFixed(0)} ₽`, color: '#f3f4f6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ background: color, textAlign: 'center', padding: '16px' }}>
            <p style={{ fontSize: '26px', fontWeight: 700 }}>{value}</p>
            <p style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>{label}</p>
          </div>
        ))}
      </div>

      {stats.topProducts.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Топ продуктов</h2>
          {stats.topProducts.map((p, i) => (
            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.topProducts.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
              <span style={{ fontSize: '14px' }}>#{i + 1} {p.name}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{p.quantity} шт.</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Заказы по статусам</h2>
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>{status}</span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
