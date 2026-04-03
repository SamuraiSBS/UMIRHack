import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/business')
      .then(r => setBusinesses(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Рестораны и магазины</h1>

      {businesses.length === 0 && (
        <p className="text-gray">Пока нет заведений. Зарегистрируйтесь как бизнес и добавьте своё!</p>
      )}

      <div className="grid grid-2">
        {businesses.map(b => (
          <Link to={`/shops/${b.id}/menu`} key={b.id}>
            <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🍽️</div>
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>{b.name}</h2>
              {b.description && <p className="text-sm text-gray" style={{ marginTop: '4px' }}>{b.description}</p>}
              <p className="text-sm" style={{ marginTop: '12px', color: '#2563eb', fontWeight: 500 }}>Смотреть меню →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
