import { useEffect, useState } from 'react';
import api from '../../api/client';
import { asArray, asNumber } from '../../lib/safeData';

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

  const topProducts = asArray(stats?.topProducts);
  const totalOrders = asNumber(stats?.totalOrders);
  const doneOrders = asNumber(stats?.doneOrders);
  const revenue = asNumber(stats?.revenue);
  const avgCheck = asNumber(stats?.avgCheck);

  return (
    <div className="page">
      <h1 className="page-title">Аналитика</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Всего заказов', value: totalOrders, color: '#1e3a5f' },
          { label: 'Выполнено', value: doneOrders, color: '#052e16' },
          { label: 'Выручка', value: `${revenue.toFixed(0)} ₽`, color: '#3b2800' },
          { label: 'Средний чек', value: `${avgCheck.toFixed(0)} ₽`, color: '#1f2937' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ background: color, textAlign: 'center', padding: '16px' }}>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#ffffff' }}>{value}</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{label}</p>
          </div>
        ))}
      </div>

      {topProducts.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Топ продуктов</h2>
          {topProducts.map((p, i) => (
            <div key={p?.name || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < topProducts.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
              <span style={{ fontSize: '14px' }}>#{i + 1} {p.name}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{p.quantity} шт.</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
