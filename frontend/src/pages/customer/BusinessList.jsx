import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';

// Deterministic "rating" and "delivery time" from business id (for demo)
function fakeRating(id) {
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (4.0 + (n % 10) * 0.1).toFixed(1);
}
function fakeReviews(id) {
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 50 + (n % 950);
}
function fakeDelivery(id) {
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const base = 10 + (n % 4) * 5;
  return `${base}–${base + 10} мин`;
}
// Gradient placeholder color
const GRADIENT_COLORS = [
  ['#FF6B6B', '#FF8E53'],
  ['#4E54C8', '#8F94FB'],
  ['#11998E', '#38EF7D'],
  ['#F953C6', '#B91D73'],
  ['#F7971E', '#FFD200'],
  ['#56CCF2', '#2F80ED'],
  ['#A18CD1', '#FBC2EB'],
  ['#43E97B', '#38F9D7'],
];
function gradientFor(id) {
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENT_COLORS[n % GRADIENT_COLORS.length];
}

const BUSINESS_IMAGES = {
  'Пицца Экспресс': '/Pizza.jpg',
  'Суши Мастер': '/Master.jpg',
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BusinessList() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [carts, setCarts] = useState({}); // { businessId: { productId: qty } }

  function changeQty(businessId, product, delta) {
    setCarts(prev => {
      const bizCart = { ...(prev[businessId] || {}) };
      const q = (bizCart[product.id] || 0) + delta;
      if (q <= 0) delete bizCart[product.id];
      else bizCart[product.id] = q;
      const next = { ...prev, [businessId]: bizCart };
      // persist to localStorage so Menu.jsx sees it
      localStorage.setItem(`cart_${businessId}`, JSON.stringify(next[businessId]));
      return next;
    });
  }

  const totalCartCount = Object.values(carts).reduce((sum, bizCart) =>
    sum + Object.values(bizCart).reduce((s, q) => s + q, 0), 0);

  const totalCartPrice = allProducts.reduce((sum, p) => {
    const q = (carts[p.businessId] || {})[p.id] || 0;
    return sum + p.price * q;
  }, 0);

  useEffect(() => {
    api.get('/business')
      .then(r => {
        setBusinesses(r.data);
        return r.data;
      })
      .then(bizList => {
        return Promise.all(
          bizList.map(b =>
            api.get(`/business/${b.id}/products`)
              .then(r => r.data.map(p => ({ ...p, businessName: b.name, businessId: b.id })))
              .catch(() => [])
          )
        );
      })
      .then(results => {
        setAllProducts(shuffleArray(results.flat()));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9E9E9E', fontSize: '16px' }}>
      Загрузка...
    </div>
  );

  const q = search.toLowerCase();
  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(q) ||
    (b.description || '').toLowerCase().includes(q) ||
    (b.deliveryZone || '').toLowerCase().includes(q)
  );
  const filteredProducts = q
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        p.businessName.toLowerCase().includes(q)
      )
    : allProducts;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(12px, 4vw, 24px) clamp(12px, 4vw, 24px) 80px' }}>
      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '28px' }}>
        <span style={{
          position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
          color: '#6B6B6B', fontSize: '18px', pointerEvents: 'none',
        }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Искать в Еде"
          style={{
            background: '#2A2A2A',
            border: '1px solid #3A3A3A',
            borderRadius: '12px',
            padding: '14px 44px',
            fontSize: '15px',
            color: '#FFFFFF',
            width: '100%',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6B6B6B',
            }}
          >×</button>
        )}
      </div>

      {/* Section title */}
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', color: '#FFFFFF' }}>
        Рестораны
      </h2>

      {filtered.length === 0 && (
        <p style={{ color: '#9E9E9E', textAlign: 'center', marginTop: '60px', fontSize: '16px' }}>
          {search ? `Ничего не найдено по запросу «${search}»` : 'Пока нет заведений.'}
        </p>
      )}

      {/* Restaurant grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
        gap: '16px',
      }}>
        {filtered.map(b => {
          const [c1, c2] = gradientFor(b.id);
          const rating = fakeRating(b.id);
          const reviews = fakeReviews(b.id);
          const delivery = fakeDelivery(b.id);
          const customImage = BUSINESS_IMAGES[b.name];

          return (
            <Link to={`/shops/${b.id}/menu`} key={b.id}>
              <div style={{
                background: '#2A2A2A',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Image / gradient area */}
                <div style={{
                  height: '160px',
                  background: customImage ? '#1C1C1C' : `linear-gradient(135deg, ${c1}, ${c2})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '56px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {customImage ? (
                    <img src={customImage} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : '🍽️'}
                  {/* Heart icon */}
                  <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px',
                  }}>♡</div>
                </div>

                {/* Info */}
                <div style={{ padding: '14px' }}>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: '#FFFFFF', marginBottom: '4px' }}>{b.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ color: '#FFD600', fontSize: '13px' }}>★ {rating}</span>
                    <span style={{ color: '#6B6B6B', fontSize: '12px' }}>({reviews})</span>
                    <span style={{ color: '#6B6B6B', fontSize: '12px' }}>·</span>
                    <span style={{ color: '#9E9E9E', fontSize: '12px' }}>⏱ {delivery}</span>
                  </div>
                  {b.deliveryZone && (
                    <p style={{ color: '#6B6B6B', fontSize: '12px' }}>📍 {b.deliveryZone}</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Food items grid */}
      {filteredProducts.length > 0 && (
        <>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '36px 0 20px', color: '#FFFFFF' }}>
            {q ? 'Найденные блюда' : 'Популярные блюда'}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '16px',
          }}>
            {filteredProducts.map(p => {
              const qty = (carts[p.businessId] || {})[p.id] || 0;
              return (
                <div key={p.id + p.businessId} style={{
                  background: '#2A2A2A',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <Link to={`/shops/${p.businessId}/menu`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      height: '140px',
                      background: '#1C1C1C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '42px',
                      position: 'relative',
                    }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : '🍽️'}
                      {qty > 0 && (
                        <div style={{
                          position: 'absolute', top: '8px', right: '8px',
                          background: '#FFD600', color: '#1C1C1C',
                          borderRadius: '50%', width: '22px', height: '22px',
                          fontSize: '12px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{qty}</div>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px 4px' }}>
                      <p style={{ fontWeight: 700, fontSize: '15px', color: '#FFFFFF', marginBottom: '2px' }}>{p.price} ₽</p>
                      <p style={{ fontSize: '13px', color: '#CCCCCC', lineHeight: 1.3, marginBottom: '2px' }}>{p.name}</p>
                      <p style={{ fontSize: '11px', color: '#6B6B6B' }}>{p.businessName}</p>
                    </div>
                  </Link>
                  {/* Cart controls */}
                  <div style={{ padding: '8px 12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {qty > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => changeQty(p.businessId, p, -1)}
                          style={{
                            background: '#3A3A3A', border: 'none', borderRadius: '50%',
                            width: '30px', height: '30px', color: '#FFFFFF', cursor: 'pointer', fontSize: '18px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >−</button>
                        <span style={{ color: '#FFFFFF', fontWeight: 700, minWidth: '16px', textAlign: 'center', fontSize: '14px' }}>{qty}</span>
                        <button
                          onClick={() => changeQty(p.businessId, p, +1)}
                          style={{
                            background: '#FFD600', border: 'none', borderRadius: '50%',
                            width: '30px', height: '30px', color: '#1C1C1C', cursor: 'pointer', fontSize: '18px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => changeQty(p.businessId, p, +1)}
                        style={{
                          background: '#FFD600', border: 'none', borderRadius: '50%',
                          width: '30px', height: '30px', color: '#1C1C1C', cursor: 'pointer', fontSize: '20px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >+</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {/* Floating cart button */}
      {totalCartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, width: 'calc(100% - 32px)', maxWidth: '480px',
        }}>
          <button
            onClick={() => {
              // navigate to the business with the most items in cart
              const topBiz = Object.entries(carts).sort((a, b) =>
                Object.values(b[1]).reduce((s, q) => s + q, 0) - Object.values(a[1]).reduce((s, q) => s + q, 0)
              )[0]?.[0];
              if (topBiz) navigate(`/shops/${topBiz}/menu`);
            }}
            style={{
              background: '#FFD600', color: '#1C1C1C',
              border: 'none', borderRadius: '16px',
              padding: '16px 24px',
              fontSize: '16px', fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              width: '100%',
            }}
          >
            <span style={{
              background: '#1C1C1C', color: '#FFD600',
              borderRadius: '8px', padding: '2px 8px', fontSize: '14px', fontWeight: 700,
            }}>{totalCartCount}</span>
            Перейти в корзину · {totalCartPrice.toFixed(0)} ₽
          </button>
        </div>
      )}
    </div>
  );
}
