import { useEffect, useState } from 'react';
import api from '../../api/client';

const ROLE_LABELS = { ADMIN: 'Админ', BUSINESS: 'Бизнес', COURIER: 'Курьер', CUSTOMER: 'Покупатель' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/users')
      .then(r => setUsers(r.data))
      .catch(() => setError('Ошибка загрузки пользователей'))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleBlock(userId) {
    setToggling(userId);
    setError('');
    try {
      const res = await api.patch(`/admin/users/${userId}/block`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: res.data.isBlocked } : u));
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка');
    } finally {
      setToggling(null);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Пользователи ({users.length})</h1>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Имя / Email</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Дата регистрации</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <p style={{ fontWeight: 600 }}>{u.name || '—'}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>{u.email}</p>
                </td>
                <td>{ROLE_LABELS[u.role] || u.role}</td>
                <td>
                  <span className={`badge ${u.isBlocked ? 'badge-cancelled' : 'badge-delivering'}`}>
                    {u.isBlocked ? 'Заблокирован' : 'Активен'}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: '#6b7280' }}>
                  {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                </td>
                <td>
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={() => handleToggleBlock(u.id)}
                      disabled={toggling === u.id}
                      className={u.isBlocked ? 'btn-success' : 'btn-danger'}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      {toggling === u.id ? '...' : u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
