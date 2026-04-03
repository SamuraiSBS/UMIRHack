import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/businesses')
      .then(r => setBusinesses(r.data))
      .catch(() => setError('Ошибка загрузки заведений'))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleBlock(bizId) {
    setToggling(bizId);
    setError('');
    try {
      const res = await api.patch(`/admin/businesses/${bizId}/block`);
      setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, isBlocked: res.data.isBlocked } : b));
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка');
    } finally {
      setToggling(null);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Заведения ({businesses.length})</h1>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Заведение</th>
              <th>Владелец</th>
              <th>Товары / Заказы</th>
              <th>Статус</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map(b => (
              <tr key={b.id}>
                <td>
                  <p style={{ fontWeight: 600 }}>{b.name}</p>
                  {b.deliveryZone && <p style={{ fontSize: '12px', color: '#6b7280' }}>📍 {b.deliveryZone}</p>}
                </td>
                <td>
                  <p style={{ fontSize: '13px' }}>{b.owner?.name || '—'}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>{b.owner?.email}</p>
                </td>
                <td style={{ fontSize: '13px' }}>
                  {b._count?.products} поз. / {b._count?.orders} заказов
                </td>
                <td>
                  <span className={`badge ${b.isBlocked ? 'badge-cancelled' : 'badge-delivering'}`}>
                    {b.isBlocked ? 'Заблокировано' : 'Активно'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleToggleBlock(b.id)}
                    disabled={toggling === b.id}
                    className={b.isBlocked ? 'btn-success' : 'btn-danger'}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    {toggling === b.id ? '...' : b.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
