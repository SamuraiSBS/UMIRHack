import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import LeafletMap from '../../components/LeafletMap';
import { CITY_OPTIONS, getCityConfig } from '../../lib/cities';
import { fetchRoute, geocodeAddress, haversineKm, reverseGeocode } from '../../lib/map';
import { asArray } from '../../lib/safeData';

export default function Cart() {
  const navigate = useNavigate();
  const [city, setCity] = useState(() => getCityConfig(localStorage.getItem('delivery_city') || '').value);

  const [cartData, setCartData] = useState(null); // { businessId, business, products, cart, tradingPoints }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [deliveryPoint, setDeliveryPoint] = useState(null);
  const [tradingPointId, setTradingPointId] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [routeMeta, setRouteMeta] = useState(null);
  const [ordering, setOrdering] = useState(false);
  const [resolvingPoint, setResolvingPoint] = useState(false);

  const cityConfig = useMemo(() => getCityConfig(city), [city]);

  useEffect(() => {
    const cartKeys = Object.keys(localStorage).filter((key) => key.startsWith('cart_'));
    if (cartKeys.length === 0) {
      setLoading(false);
      return;
    }

    let foundKey = null;
    let foundCart = {};
    for (const key of cartKeys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        if (Object.keys(parsed).length > 0) {
          foundKey = key;
          foundCart = parsed;
          break;
        }
      } catch {
        // skip invalid cart entries
      }
    }

    if (!foundKey) {
      setLoading(false);
      return;
    }

    const businessId = foundKey.replace('cart_', '');

    async function loadCart() {
      setLoading(true);
      setError('');
      try {
        const [biz, prods, points] = await Promise.all([
          api.get(`/business/${businessId}`).then((r) => r.data),
          api.get(`/business/${businessId}/products`).then((r) => r.data),
          api.get(`/business/${businessId}/trading-points`).then((r) => r.data).catch(() => []),
        ]);
        setCartData({ businessId, business: biz, products: asArray(prods), cart: foundCart, tradingPoints: asArray(points) });
      } catch (err) {
        setError(err.response?.data?.error || 'Не удалось загрузить данные корзины');
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, []);

  useEffect(() => {
    localStorage.setItem('delivery_city', city);
  }, [city]);

  useEffect(() => {
    if (!tradingPointId && cartData?.tradingPoints?.length > 0) {
      setTradingPointId(cartData.tradingPoints[0].id);
    }
  }, [cartData?.tradingPoints, tradingPointId]);

  useEffect(() => {
    setDeliveryPoint(null);
    setAddress('');
    setAddressDetails('');
    setDistanceKm('');
    setRouteMeta(null);
  }, [city]);

  useEffect(() => {
    let cancelled = false;

    async function buildRoute() {
      if (!deliveryPoint || !cartData?.business) {
        setDistanceKm('');
        setRouteMeta(null);
        return;
      }

      const tradingPoints = cartData.tradingPoints || [];
      const pickupSource = tradingPoints.find((point) => point.id === tradingPointId) || tradingPoints[0] || null;
      const pickupFromPoint = pickupSource?.lat != null && pickupSource?.lng != null
        ? { lat: pickupSource.lat, lng: pickupSource.lng, label: pickupSource.address }
        : null;
      const pickupQuery = pickupSource?.address || `${cartData.business.name}, ${cartData.business.description || ''}`;

      try {
        const pickup = pickupFromPoint || await geocodeAddress(pickupQuery, city);
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
  }, [cartData, city, cityConfig.center, deliveryPoint, tradingPointId]);

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
    setCartData((prev) => {
      if (!prev) return prev;
      const next = { ...prev.cart };
      const q = (next[productId] || 0) + delta;
      if (q <= 0) delete next[productId];
      else next[productId] = q;
      const updated = { ...prev, cart: next };
      localStorage.setItem(`cart_${prev.businessId}`, JSON.stringify(next));
      return updated;
    });
  }

  const cartItems = cartData
    ? Object.entries(cartData.cart)
        .map(([productId, quantity]) => {
          const product = cartData.products.find((p) => p.id === productId);
          return product ? { productId, quantity, product } : null;
        })
        .filter(Boolean)
    : [];

  const total = cartItems.reduce((sum, { quantity, product }) => sum + product.price * quantity, 0);
  const cartCount = cartItems.reduce((sum, { quantity }) => sum + quantity, 0);
  const deliveryCost = distanceKm ? Math.max(50, Math.round(50 + Number(distanceKm) * 15)) : 0;
  const selectedTradingPoint = cartData?.tradingPoints?.find((point) => point.id === tradingPointId) || cartData?.tradingPoints?.[0] || null;

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
      const resolvedTradingPointId = tradingPointId || cartData.tradingPoints?.[0]?.id;
      await api.post('/orders', {
        businessId: cartData.businessId,
        city,
        address: fullAddress,
        deliveryLat: deliveryPoint.lat,
        deliveryLng: deliveryPoint.lng,
        items: cartItems.map(({ productId, quantity }) => ({ productId, quantity })),
        ...(resolvedTradingPointId && { tradingPointId: resolvedTradingPointId }),
        ...(distanceKm && { distanceKm: Number(distanceKm) }),
      });
      setSuccess('Заказ оформлен! Переходим к вашим заказам...');
      localStorage.removeItem(`cart_${cartData.businessId}`);
      setTimeout(() => navigate('/orders'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка оформления заказа');
    } finally {
      setOrdering(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9E9E9E', fontSize: '16px' }}>
      Загрузка корзины...
    </div>
  );

  if (!cartData || cartItems.length === 0) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '60px' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
      <h2 style={{ color: '#FFFFFF', fontSize: '22px', marginBottom: '8px' }}>Корзина пуста</h2>
      <p style={{ color: '#9E9E9E', marginBottom: '24px' }}>Добавьте товары из меню заведений</p>
      <button onClick={() => navigate('/shops')} className="btn-outline">
        Перейти к заведениям
      </button>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={() => navigate(`/shops/${cartData.businessId}/menu`)} className="btn-outline" style={{ marginBottom: '16px', fontSize: '13px' }}>
        ← Назад в меню
      </button>

      <h1 className="page-title">Корзина</h1>

      <div style={{
        background: '#2A2A2A', borderRadius: '12px',
        padding: '12px 16px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ fontSize: '20px' }}>🏪</span>
        <div>
          <p style={{ color: '#9E9E9E', fontSize: '12px' }}>Заведение</p>
          <p style={{ color: '#FFFFFF', fontWeight: 600 }}>{cartData.business?.name}</p>
        </div>
      </div>

      <div style={{ background: '#2A2A2A', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
        <h3 style={{ color: '#FFFFFF', fontWeight: 700, marginBottom: '16px', fontSize: '16px' }}>
          Состав заказа
        </h3>
        {cartItems.map(({ productId, quantity, product }) => (
          <div key={productId} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '12px', gap: '8px',
          }}>
            <span style={{ color: '#CCCCCC', fontSize: '14px', flex: 1, minWidth: 0 }}>{product.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button onClick={() => changeQty(productId, -1)} style={{
                background: '#3A3A3A', border: 'none', borderRadius: '50%',
                width: '30px', height: '30px', color: '#FFFFFF', cursor: 'pointer', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
              }}>−</button>
              <span style={{ color: '#FFFFFF', fontWeight: 600, minWidth: '22px', textAlign: 'center' }}>{quantity}</span>
              <button onClick={() => changeQty(productId, +1)} style={{
                background: '#3A3A3A', border: 'none', borderRadius: '50%',
                width: '30px', height: '30px', color: '#FFFFFF', cursor: 'pointer', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
              }}>+</button>
              <span style={{ color: '#FFFFFF', fontWeight: 600, minWidth: '70px', textAlign: 'right', fontSize: '14px' }}>
                {(product.price * quantity).toFixed(0)} ₽
              </span>
            </div>
          </div>
        ))}

        <hr style={{ borderColor: '#3A3A3A', margin: '14px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9E9E9E', fontSize: '14px', marginBottom: '6px' }}>
          <span>Товары ({cartCount} шт.)</span>
          <span>{total.toFixed(0)} ₽</span>
        </div>
        {deliveryCost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9E9E9E', fontSize: '14px', marginBottom: '6px' }}>
            <span>Доставка</span>
            <span>{deliveryCost} ₽</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '18px', color: '#FFFFFF', marginTop: '8px' }}>
          <span>Итого</span>
          <span>{(total + deliveryCost).toFixed(0)} ₽</span>
        </div>
      </div>

      <div style={{ background: '#2A2A2A', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ color: '#FFFFFF', fontWeight: 700, marginBottom: '16px', fontSize: '16px' }}>
          Оформление заказа
        </h3>

        {error && <div className="error-msg">{error}</div>}
        {success && (
          <div style={{ background: '#064e3b', color: '#34d399', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px', fontSize: '14px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleOrder}>
          <div className="form-group">
            <label>Город</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              {CITY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.value}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Адрес доставки</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ул. Пушкина, д. 1, кв. 10"
              required
            />
          </div>

          <div className="form-group">
            <label>Комментарий к адресу</label>
            <input
              value={addressDetails}
              onChange={(e) => setAddressDetails(e.target.value)}
              placeholder="подъезд, этаж, квартира"
            />
          </div>

          <div className="form-group">
            <label>Точка на карте</label>
            <div style={{ marginBottom: '10px' }}>
              <LeafletMap
                center={deliveryPoint ? [deliveryPoint.lat, deliveryPoint.lng] : cityConfig.center}
                zoom={deliveryPoint ? 14 : cityConfig.zoom}
                onMapClick={handleMapClick}
                origin={selectedTradingPoint?.lat != null && selectedTradingPoint?.lng != null
                  ? { lat: selectedTradingPoint.lat, lng: selectedTradingPoint.lng }
                  : null}
                destination={deliveryPoint}
                route={routeMeta?.coordinates}
                height={260}
              />
            </div>
            <p style={{ fontSize: '13px', color: '#9E9E9E' }}>
              Нажмите на карту, чтобы указать точку доставки.
              {resolvingPoint ? ' Определяем адрес...' : ''}
            </p>
            {routeMeta && (
              <p style={{ fontSize: '13px', color: '#9E9E9E', marginTop: '6px' }}>
                Примерное время в пути: {Math.round(routeMeta.durationMin)} мин
              </p>
            )}
          </div>

          {cartData.tradingPoints.length > 0 && (
            <div className="form-group">
              <label>Точка отправки</label>
              <select value={tradingPointId} onChange={(e) => setTradingPointId(e.target.value)}>
                {cartData.tradingPoints.map((point) => (
                  <option key={point.id} value={point.id}>{point.name} — {point.address}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Расстояние, км</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
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
            marginTop: '4px',
          }}>
            {ordering ? 'Оформляем...' : `Заказать · ${(total + deliveryCost).toFixed(0)} ₽`}
          </button>
        </form>
      </div>
    </div>
  );
}
