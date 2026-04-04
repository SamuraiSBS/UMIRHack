import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

// Status label badge
function StatusBadge({ status }) {
  const map = {
    CREATED: ['badge-created', 'Создан'],
    ACCEPTED: ['badge-accepted', 'Принят'],
    DELIVERING: ['badge-delivering', 'Доставляется'],
    DONE: ['badge-done', 'Доставлен'],
  };
  const [cls, label] = map[status] || ['badge-done', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function Menu() {
  const { id } = useParams(); // businessId
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({}); // { productId: quantity }
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/business').then(r => r.data.find(b => b.id === id)),
      api.get(`/business/${id}/products`).then(r => r.data),
    ]).then(([biz, prods]) => {
      setBusiness(biz);
      setProducts(prods);
    }).finally(() => setLoading(false));
  }, [id]);

  function changeQty(productId, delta) {
    setCart(prev => {
      const next = { ...prev };
      const q = (next[productId] || 0) + delta;
      if (q <= 0) delete next[productId];
      else next[productId] = q;
      return next;
    });
  }

  const cartItems = Object.entries(cart).map(([productId, quantity]) => {
    const product = products.find(p => p.id === productId);
    return { productId, quantity, product };
  });

  const total = cartItems.reduce((sum, { quantity, product }) => sum + product.price * quantity, 0);

  async function handleOrder(e) {
    e.preventDefault();
    if (!address.trim()) { setError('Укажите адрес доставки'); return; }
    if (cartItems.length === 0) { setError('Корзина пуста'); return; }

    setError('');
    setOrdering(true);
    try {
      await api.post('/orders', {
        businessId: id,
        address: address.trim(),
        items: cartItems.map(({ productId, quantity }) => ({ productId, quantity })),
      });
      setSuccess('Заказ оформлен! Переходим к вашим заказам...');
      setCart({});
      setTimeout(() => navigate('/orders'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка оформления заказа');
    } finally {
      setOrdering(false);
    }
  }

  if (loading) return <div className="page"><p>Загрузка меню...</p></div>;

  return (
    <div className="page">
      <button onClick={() => navigate('/shops')} className="btn-outline" style={{ marginBottom: '16px', fontSize: '13px' }}>
        ← Назад
      </button>

      <h1 className="page-title">{business?.name || 'Меню'}</h1>
      {business?.description && <p className="text-gray text-sm" style={{ marginBottom: '20px' }}>{business.description}</p>}

      {products.length === 0 && <p className="text-gray">Меню пока пусто.</p>}

      {(() => {
        const grouped = products.reduce((acc, p) => {
          const key = p.category || 'Остальное';
          if (!acc[key]) acc[key] = [];
          acc[key].push(p);
          return acc;
        }, {});
        return Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            {Object.keys(grouped).length > 1 && (
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '20px 0 10px' }}>{category}</h3>
            )}
            <div className="grid grid-2">
              {items.map(p => (
                <div key={p.id} className="card">
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{p.name}</h3>
                      {p.description && <p className="text-sm text-gray" style={{ marginTop: '2px' }}>{p.description}</p>}
                      <p style={{ marginTop: '8px', fontWeight: 700, color: '#2563eb' }}>{p.price} ₽</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {cart[p.id] ? (
                        <>
                          <button onClick={() => changeQty(p.id, -1)} className="btn-outline"
                            style={{ padding: '4px 10px', fontSize: '16px' }}>−</button>
                          <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{cart[p.id]}</span>
                          <button onClick={() => changeQty(p.id, +1)} className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: '16px' }}>+</button>
                        </>
                      ) : (
                        <button onClick={() => changeQty(p.id, +1)} className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '13px' }}>Добавить</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ));
      })()}

      {/* Cart / Order form */}
      {cartItems.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '12px' }}>Корзина</h2>

          {cartItems.map(({ productId, quantity, product }) => (
            <div key={productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span>{product.name} × {quantity}</span>
              <span>{(product.price * quantity).toFixed(0)} ₽</span>
            </div>
          ))}

          <hr style={{ margin: '10px 0', borderColor: '#e5e7eb' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '16px' }}>
            <span>Итого</span>
            <span>{total.toFixed(0)} ₽</span>
          </div>

          {error && <div className="error-msg">{error}</div>}
          {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px' }}>{success}</div>}

          <form onSubmit={handleOrder}>
            <div className="form-group">
              <label>Адрес доставки</label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="ул. Пушкина, д. 1, кв. 10"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={ordering}>
              {ordering ? 'Оформляем...' : `Заказать на ${total.toFixed(0)} ₽`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
