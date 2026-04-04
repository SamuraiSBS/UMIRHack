import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

// Product modal (Yandex Food style)
function ProductModal({ product, qty, onClose, onAdd, onChangeQty }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1C1C1C',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '640px',
          width: '100%',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', fontSize: '18px', color: '#FFFFFF',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}
        >×</button>

        {/* Image */}
        <div style={{
          width: '100%',
          height: '200px',
          flexShrink: 0,
          background: '#2A2A2A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span style={{ fontSize: '64px' }}>🍽️</span>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minHeight: '260px' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '18px', color: '#FFFFFF', marginBottom: '6px' }}>
              {product.name}
              {product.weight && <span style={{ fontWeight: 400, color: '#9E9E9E', fontSize: '15px' }}> {product.weight}</span>}
            </p>
            {product.description && (
              <p style={{ color: '#9E9E9E', fontSize: '14px', marginBottom: '12px', lineHeight: 1.5 }}>{product.description}</p>
            )}
          </div>

          <div>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>{product.price} ₽</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {qty > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#2A2A2A', borderRadius: '12px', padding: '4px' }}>
                    <button
                      onClick={() => onChangeQty(product.id, -1)}
                      style={{
                        background: '#3A3A3A', border: 'none', borderRadius: '8px',
                        width: '36px', height: '36px', fontSize: '20px', color: '#FFFFFF',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >−</button>
                    <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 700, fontSize: '16px', color: '#FFFFFF' }}>{qty}</span>
                    <button
                      onClick={() => onChangeQty(product.id, +1)}
                      style={{
                        background: '#3A3A3A', border: 'none', borderRadius: '8px',
                        width: '36px', height: '36px', fontSize: '20px', color: '#FFFFFF',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >+</button>
                  </div>
                  <button
                    onClick={() => { onAdd(); onClose(); }}
                    style={{
                      background: '#FFD600', color: '#1C1C1C', border: 'none',
                      borderRadius: '12px', padding: '10px 20px', fontWeight: 700, fontSize: '15px',
                      cursor: 'pointer', flex: 1,
                    }}
                  >Добавить</button>
                </>
              ) : (
                <button
                  onClick={() => { onChangeQty(product.id, +1); }}
                  style={{
                    background: '#FFD600', color: '#1C1C1C', border: 'none',
                    borderRadius: '12px', padding: '12px 24px', fontWeight: 700, fontSize: '15px',
                    cursor: 'pointer', width: '100%',
                  }}
                >Добавить</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Menu() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [tradingPoints, setTradingPoints] = useState([]);
  const [cart, setCart] = useState({}); // { productId: quantity }
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [saveAddress, setSaveAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [address, setAddress] = useState('');
  const [tradingPointId, setTradingPointId] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalProduct, setModalProduct] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(`cart_${id}`);
      setCart(savedCart ? JSON.parse(savedCart) : {});
    } catch {
      setCart({});
    }
  }, [id]);

  useEffect(() => {
    localStorage.setItem(`cart_${id}`, JSON.stringify(cart));
  }, [cart, id]);

  useEffect(() => {
    let isMounted = true;

    async function loadMenu() {
      setLoading(true);
      setError('');

      try {
        const [biz, prods, points, addresses] = await Promise.all([
          api.get(`/business/${id}`).then(r => r.data),
          api.get(`/business/${id}/products`).then(r => r.data),
          api.get(`/business/${id}/trading-points`).then(r => r.data).catch(() => []),
          api.get('/addresses').then(r => r.data).catch(() => []),
        ]);

        if (!isMounted) return;

        setBusiness(biz);
        setProducts(prods);
        setTradingPoints(points);
        setSavedAddresses(addresses);
      } catch (err) {
        if (!isMounted) return;
        setError(err.response?.data?.error || 'Не удалось загрузить меню');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMenu();

    return () => {
      isMounted = false;
    };
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

  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      return product ? { productId, quantity, product } : null;
    })
    .filter(Boolean);

  const total = cartItems.reduce((sum, { quantity, product }) => sum + product.price * quantity, 0);
  const cartCount = cartItems.reduce((sum, { quantity }) => sum + quantity, 0);

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
        ...(tradingPointId && { tradingPointId }),
        ...(distanceKm && { distanceKm: Number(distanceKm) }),
      });
      setSuccess('Заказ оформлен! Переходим к вашим заказам...');
      setCart({});
      localStorage.removeItem(`cart_${id}`);
      setShowOrderForm(false);
      setTimeout(() => navigate('/orders'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка оформления заказа');
    } finally {
      setOrdering(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9E9E9E', fontSize: '16px' }}>
      Загрузка меню...
    </div>
  );

  const grouped = products.reduce((acc, p) => {
    const key = p.category || 'Меню';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const deliveryCost = distanceKm ? Math.max(50, Math.round(50 + Number(distanceKm) * 15)) : 0;

  return (
    <div className="page">
      <button onClick={() => navigate('/shops')} className="btn-outline" style={{ marginBottom: '16px', fontSize: '13px' }}>
        ← Назад
      </button>

      <h1 className="page-title">{business?.name || 'Меню'}</h1>
      {error && <div className="error-msg" style={{ marginBottom: '16px' }}>{error}</div>}
      {business?.description && <p className="text-gray text-sm" style={{ marginBottom: '8px' }}>{business.description}</p>}
      {business?.deliveryZone && (
        <p className="text-sm text-gray" style={{ marginBottom: '4px' }}>Зона доставки: {business.deliveryZone}</p>
      )}
      {tradingPoints.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p className="text-sm" style={{ fontWeight: 600, marginBottom: '4px' }}>Адреса:</p>
          {tradingPoints.map(tp => (
            <p key={tp.id} className="text-sm text-gray">📍 {tp.name}: {tp.address}</p>
          ))}
        </div>
      )}

      {/* Products by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: '36px' }}>
          {Object.keys(grouped).length > 1 && (
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>{category}</h2>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            {items.map(p => (
              <div
                key={p.id}
                onClick={() => setModalProduct(p)}
                style={{
                  background: '#2A2A2A',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                {/* Product image area */}
                <div style={{
                  height: '160px',
                  background: '#1C1C1C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div style={{
                    display: p.imageUrl ? 'none' : 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: '100%', fontSize: '52px',
                  }}>🍽️</div>

                  {/* Add button in corner */}
                  <button
                    onClick={e => { e.stopPropagation(); changeQty(p.id, +1); }}
                    style={{
                      position: 'absolute', bottom: '10px', right: '10px',
                      width: '34px', height: '34px', borderRadius: '50%',
                      background: '#FFD600',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      border: 'none', fontSize: '22px', color: '#1C1C1C',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >+</button>

                  {/* Cart badge */}
                  {cart[p.id] > 0 && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: '#FFD600', color: '#1C1C1C',
                      borderRadius: '50%', width: '22px', height: '22px',
                      fontSize: '12px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{cart[p.id]}</div>
                  )}
                </div>

                {/* Product info */}
                <div style={{ padding: '10px 12px 12px' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF', marginBottom: '2px', lineHeight: 1.3 }}>{p.price} ₽</p>
                  <p style={{ fontSize: '12px', color: '#CCCCCC', lineHeight: 1.3, marginBottom: '1px' }}>{p.name}</p>
                  {p.description && (
                    <p style={{ fontSize: '11px', color: '#6B6B6B', lineHeight: 1.3 }}>{p.description.slice(0, 50)}{p.description.length > 50 ? '…' : ''}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Floating cart button */}
      {cartCount > 0 && !showOrderForm && (
        <div style={{
          position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, width: 'calc(100% - 32px)', maxWidth: '480px',
        }}>
          <button
            onClick={() => setShowOrderForm(true)}
            style={{
              background: '#FFD600', color: '#1C1C1C',
              border: 'none', borderRadius: '16px',
              padding: '16px 24px',
              fontSize: '16px', fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              whiteSpace: 'nowrap',
              width: '100%',
            }}
          >
            <span style={{
              background: '#1C1C1C', color: '#FFD600',
              borderRadius: '8px', padding: '2px 8px', fontSize: '14px', fontWeight: 700,
            }}>{cartCount}</span>
            Перейти в корзину · {total.toFixed(0)} ₽
          </button>
        </div>
      )}

      {/* Order form (slide up when cart opened) */}
      {showOrderForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setShowOrderForm(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1C1C1C', borderRadius: '20px 20px 0 0',
              padding: '28px 24px 40px',
              width: '100%', maxWidth: '560px',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>Корзина</h2>
              <button onClick={() => setShowOrderForm(false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', fontSize: '18px', color: '#FFFFFF', cursor: 'pointer',
              }}>×</button>
            </div>

            {/* Cart items */}
            {cartItems.map(({ productId, quantity, product }) => (
              <div key={productId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '12px',
              }}>
                <span style={{ color: '#CCCCCC', fontSize: '14px', flex: 1 }}>{product.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => changeQty(productId, -1)} style={{
                    background: '#2A2A2A', border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px', color: '#FFFFFF', cursor: 'pointer', fontSize: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, lineHeight: 1,
                  }}>−</button>
                  <span style={{ color: '#FFFFFF', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{quantity}</span>
                  <button onClick={() => changeQty(productId, +1)} style={{
                    background: '#2A2A2A', border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px', color: '#FFFFFF', cursor: 'pointer', fontSize: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, lineHeight: 1,
                  }}>+</button>
                  <span style={{ color: '#FFFFFF', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>
                    {(product.price * quantity).toFixed(0)} ₽
                  </span>
                </div>
              </div>
            ))}

            <hr style={{ borderColor: '#3A3A3A', margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', color: '#FFFFFF', marginBottom: '20px' }}>
              <span>Итого</span>
              <span>{(total + deliveryCost).toFixed(0)} ₽</span>
            </div>

            {error && <div className="error-msg">{error}</div>}
            {success && (
              <div style={{ background: '#064e3b', color: '#34d399', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px', fontSize: '14px' }}>
                {success}
              </div>
            )}

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

              {tradingPoints.length > 0 && (
                <div className="form-group">
                  <label>Точка отправки</label>
                  <select value={tradingPointId} onChange={e => setTradingPointId(e.target.value)}>
                    <option value="">— Выберите точку —</option>
                    {tradingPoints.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.address}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Расстояние, км</label>
                <input
                  type="number" min="0" step="0.1"
                  value={distanceKm}
                  onChange={e => setDistanceKm(e.target.value)}
                  placeholder="например 3.5"
                />
              </div>
              {distanceKm && (
                <p style={{ fontSize: '13px', color: '#9E9E9E', marginBottom: '12px' }}>
                  Стоимость доставки: {deliveryCost} ₽
                </p>
              )}

              <button type="submit" disabled={ordering} style={{
                background: '#FFD600', color: '#1C1C1C', border: 'none',
                borderRadius: '14px', padding: '16px', fontWeight: 700, fontSize: '16px',
                cursor: ordering ? 'not-allowed' : 'pointer',
                width: '100%', opacity: ordering ? 0.7 : 1,
              }}>
                {ordering ? 'Оформляем...' : `Заказать · ${(total + deliveryCost).toFixed(0)} ₽`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product modal */}
      {modalProduct && (
        <ProductModal
          product={modalProduct}
          qty={cart[modalProduct.id] || 0}
          onClose={() => setModalProduct(null)}
          onAdd={() => setModalProduct(null)}
          onChangeQty={changeQty}
        />
      )}
    </div>
  );
}
