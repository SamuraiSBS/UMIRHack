import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/business')
      .then(r => setBusinesses(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  const q = search.toLowerCase();
  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(q) ||
    (b.description || '').toLowerCase().includes(q) ||
    (b.deliveryZone || '').toLowerCase().includes(q)
  );

  return (
    <div className="page">
      <h1 className="page-title">Рестораны и магазины</h1>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию или зоне доставки..."
          style={{ paddingRight: search ? '32px' : undefined }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6b7280' }}
          >×</button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-gray">{search ? `Ничего не найдено по запросу «${search}»` : 'Пока нет заведений. Зарегистрируйтесь как бизнес и добавьте своё!'}</p>
      )}

      <div className="grid grid-2">
        {filtered.map(b => (
          <Link to={`/shops/${b.id}/menu`} key={b.id}>
            <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🍽️</div>
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>{b.name}</h2>
              {b.description && <p className="text-sm text-gray" style={{ marginTop: '4px' }}>{b.description}</p>}
              {b.deliveryZone && (
                <p className="text-sm" style={{ marginTop: '6px', color: '#6b7280' }}>
                  📍 {b.deliveryZone}
                </p>
              )}
              <p className="text-sm" style={{ marginTop: '12px', color: '#2563eb', fontWeight: 500 }}>Смотреть меню →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
