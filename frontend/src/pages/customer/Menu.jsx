import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import LeafletMap from '../../components/LeafletMap';
import { CITY_OPTIONS, getCityConfig } from '../../lib/cities';
import { fetchRoute, geocodeAddress, haversineKm, reverseGeocode } from '../../lib/map';

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
  const [tradingPoints, setTradingPoints] = useState([]);
  const [cart, setCart] = useState({}); // { productId: quantity }
  const [city, setCity] = useState(CITY_OPTIONS[0].value);
  const [address, setAddress] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [deliveryPoint, setDeliveryPoint] = useState(null);
  const [tradingPointId, setTradingPointId] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [routeMeta, setRouteMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [resolvingPoint, setResolvingPoint] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cityConfig = useMemo(() => getCityConfig(city), [city]);

  useEffect(() => {
    Promise.all([
      api.get('/business').then(r => r.data.find(b => b.id === id)),
      api.get(`/business/${id}/products`).then(r => r.data),
      api.get(`/business/${id}/trading-points`).then(r => r.data).catch(() => []),
    ]).then(([biz, prods, points]) => {
      setBusiness(biz);
      setProducts(prods);
      setTradingPoints(points);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setDeliveryPoint(null);
    setAddress('');
    setAddressDetails('');
    setDistanceKm('');
    setRouteMeta(null);
    setTradingPointId('');
  }, [city]);

  useEffect(() => {
    let cancelled = false;

    async function buildRoute() {
      if (!deliveryPoint || !business) {
        setDistanceKm('');
        setRouteMeta(null);
        return;
      }

      const pickupSource = tradingPoints.find((point) => point.id === tradingPointId);
      const pickupQuery = pickupSource
        ? `${pickupSource.address}`
        : `${business.name}, ${business.description || ''}`;

      try {
        const pickup = await geocodeAddress(pickupQuery, city);
        if (cancelled || !pickup) {
          const fallbackDistance = haversineKm(
            { lat: cityConfig.center[0], lng: cityConfig.center[1] },
            deliveryPoint
          );
          setDistanceKm(fallbackDistance.toFixed(1));
          setRouteMeta(null);
          return;
        }

        const route = await fetchRoute(pickup, deliveryPoint);
        if (cancelled) return;

        if (route) {
          setDistanceKm(route.distanceKm.toFixed(1));
          setRouteMeta(route);
        } else {
          const fallbackDistance = haversineKm(pickup, deliveryPoint);
          setDistanceKm(fallbackDistance.toFixed(1));
          setRouteMeta(null);
        }
      } catch {
        if (cancelled) return;
        const fallbackDistance = haversineKm(
          { lat: cityConfig.center[0], lng: cityConfig.center[1] },
          deliveryPoint
        );
        setDistanceKm(fallbackDistance.toFixed(1));
        setRouteMeta(null);
      }
    }

    buildRoute();
    return () => {
      cancelled = true;
    };
  }, [business, city, cityConfig.center, deliveryPoint, tradingPointId, tradingPoints]);

  async function handleMapClick(point) {
    setError('');
    setResolvingPoint(true);
    setDeliveryPoint(point);
    try {
      const result = await reverseGeocode(point.lat, point.lng);
      const baseAddress = result.display_name || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
      setAddress(baseAddress);
    } catch {
      setAddress(`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
    } finally {
      setResolvingPoint(false);
    }
  }

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
    if (!city.trim()) { setError('Выберите город'); return; }
    if (!deliveryPoint) { setError('Укажите точку доставки на карте'); return; }
    if (!address.trim()) { setError('Укажите адрес доставки'); return; }
    if (cartItems.length === 0) { setError('Корзина пуста'); return; }

    setError('');
    setOrdering(true);
    try {
      const fullAddress = [city, address.trim(), addressDetails.trim()].filter(Boolean).join(', ');
      await api.post('/orders', {
        businessId: id,
        city,
        address: fullAddress,
        deliveryLat: deliveryPoint.lat,
        deliveryLng: deliveryPoint.lng,
        items: cartItems.map(({ productId, quantity }) => ({ productId, quantity })),
        ...(tradingPointId && { tradingPointId }),
        ...(distanceKm && { distanceKm: Number(distanceKm) }),
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

      <div className="grid grid-2">
        {products.map(p => (
          <div key={p.id} className="card">
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
              <label>Город доставки</label>
              <select value={city} onChange={e => setCity(e.target.value)}>
                {CITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.value}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Точка доставки на карте</label>
              <LeafletMap
                center={cityConfig.center}
                zoom={cityConfig.zoom}
                destination={deliveryPoint}
                route={routeMeta?.coordinates}
                onMapClick={handleMapClick}
                height={340}
              />
              <p className="text-sm text-gray">
                Сначала выберите город, затем нажмите на реальную карту OpenStreetMap в нужной точке.
              </p>
            </div>

            {tradingPoints.length > 0 && (
              <div className="form-group">
                <label>Точка отправки (откуда забрать)</label>
                <select value={tradingPointId} onChange={e => setTradingPointId(e.target.value)}>
                  <option value="">— Выберите точку —</option>
                  {tradingPoints.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.address}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Адрес по выбранной точке</label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Кликните по карте, чтобы подставить адрес"
                required
              />
            </div>

            <div className="form-group">
              <label>Квартира, подъезд, комментарий</label>
              <input
                value={addressDetails}
                onChange={e => setAddressDetails(e.target.value)}
                placeholder="кв. 10, домофон 25, позвонить за 5 минут"
              />
            </div>

            <div className="form-group">
              <label>Расчёт маршрута</label>
              <input
                type="text"
                value={
                  resolvingPoint
                    ? 'Определяем адрес по карте...'
                    : routeMeta
                      ? `${routeMeta.distanceKm.toFixed(1)} км, ~${Math.max(5, Math.round(routeMeta.durationMin))} мин`
                      : distanceKm
                        ? `${distanceKm} км`
                        : 'Маршрут появится после выбора точки'
                }
                readOnly
              />
            </div>

            {distanceKm && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                Стоимость доставки: {Math.max(50, Math.round(50 + Number(distanceKm) * 15))} ₽
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={ordering}>
              {ordering ? 'Оформляем...' : `Заказать на ${total.toFixed(0)} ₽`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
