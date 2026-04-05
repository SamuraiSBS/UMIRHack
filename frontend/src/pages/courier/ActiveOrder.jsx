import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import LeafletMap from '../../components/LeafletMap';
import { fetchRoute } from '../../lib/map';
import { asArray, asNumber, formatCurrency } from '../../lib/safeData';

const STATUS_LABELS = {
  ACCEPTED: 'Принят — едете к точке выдачи',
  DELIVERING: 'В пути к клиенту',
  DONE: 'Доставлен',
};

const NEXT_STATUS = {
  ACCEPTED: { status: 'DELIVERING', label: 'Забрал заказ — везу клиенту' },
  DELIVERING: { status: 'DONE', label: 'Доставил заказ' },
};

export default function ActiveOrder() {
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]); // completed orders
  const [route, setRoute] = useState(null);
  const [courierPosition, setCourierPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Подключаем геолокацию...');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const lastSyncRef = useRef(0);

  function load() {
    return api.get('/courier/orders').then(r => {
      const orders = asArray(r.data);
      const active = orders.find(o => o.status === 'ACCEPTED' || o.status === 'DELIVERING');
      const done = orders.filter(o => o.status === 'DONE');
      setOrder(active || null);
      setHistory(done);
    });
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.response?.data?.error || 'Не удалось загрузить активный заказ'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (order?.courierLat != null && order?.courierLng != null) {
      setCourierPosition({ lat: order.courierLat, lng: order.courierLng });
    }
  }, [order?.courierLat, order?.courierLng]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutePreview() {
      const pickupPoint = order?.tradingPoint?.lat != null && order?.tradingPoint?.lng != null
        ? { lat: order.tradingPoint.lat, lng: order.tradingPoint.lng }
        : null;
      const routeStart = pickupPoint || courierPosition;

      if (order?.deliveryLat == null || order?.deliveryLng == null || !routeStart) {
        setRoute(null);
        return;
      }

      try {
        const result = await fetchRoute(routeStart, {
          lat: order.deliveryLat,
          lng: order.deliveryLng,
        });
        if (!cancelled) setRoute(result);
      } catch {
        if (!cancelled) setRoute(null);
      }
    }

    loadRoutePreview();
    return () => {
      cancelled = true;
    };
  }, [courierPosition, order?.deliveryLat, order?.deliveryLng, order?.tradingPoint?.lat, order?.tradingPoint?.lng]);

  useEffect(() => {
    if (!order || !['ACCEPTED', 'DELIVERING'].includes(order.status)) return undefined;
    if (!navigator.geolocation) {
      setGeoStatus('Браузер не поддерживает геолокацию.');
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const nextPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCourierPosition(nextPosition);
        setGeoStatus('Локация курьера обновляется в реальном времени.');

        const now = Date.now();
        if (now - lastSyncRef.current < 10000) return;
        lastSyncRef.current = now;

        try {
          await api.patch(`/orders/${order.id}/location`, nextPosition);
        } catch {
          setGeoStatus('Не удалось отправить текущую геопозицию на сервер.');
        }
      },
      (geoError) => {
        setGeoStatus(geoError.message || 'Доступ к геопозиции отклонён.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [order]);

  async function updateStatus() {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setUpdating(true);
    setError('');
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next.status });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления статуса');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  const items = asArray(order?.items);
  const businessName = order?.business?.name || 'Заведение';
  const customerName = order?.customer?.name || order?.customer?.email || 'Клиент';
  const totalPrice = asNumber(order?.totalPrice);

  return (
    <div className="page" style={{ maxWidth: '560px' }}>
      <h1 className="page-title">Мой заказ</h1>

      {error && <div className="error-msg">{error}</div>}

      {!order ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', marginBottom: '16px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>✅</p>
          <p className="text-gray">Нет активного заказа.</p>
          <button className="btn-primary" style={{ marginTop: '16px' }}
            onClick={() => navigate('/courier/orders')}>
            Смотреть доступные заказы
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '16px' }}>
          {/* Status */}
          <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
            <p style={{ fontWeight: 700, color: '#1d4ed8' }}>{STATUS_LABELS[order.status] || 'Статус обновляется'}</p>
          </div>

          {/* Business */}
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Ресторан / магазин</p>
          <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '12px' }}>{businessName}</p>

          {/* Delivery address — shown only after accepting */}
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Адрес доставки</p>
          <p style={{ fontWeight: 600, marginBottom: '12px', color: '#111827' }}>{order.address}</p>

          {order.deliveryLat != null && order.deliveryLng != null && (
            <div style={{ marginBottom: '14px' }}>
              <div className="tracking-summary">
                <div>
                  <strong>Маршрут от точки бизнеса до клиента</strong>
                  <p className="text-sm text-gray">{geoStatus}</p>
                </div>
                {route && (
                  <div style={{ textAlign: 'right' }}>
                    <strong>~{Math.max(5, Math.round(route.durationMin))} мин</strong>
                    <p className="text-sm text-gray">{route.distanceKm.toFixed(1)} км</p>
                  </div>
                )}
              </div>
              <LeafletMap
                center={[order.deliveryLat, order.deliveryLng]}
                zoom={13}
                interactive={false}
                origin={order.tradingPoint?.lat != null && order.tradingPoint?.lng != null ? { lat: order.tradingPoint.lat, lng: order.tradingPoint.lng } : null}
                destination={{ lat: order.deliveryLat, lng: order.deliveryLng }}
                courier={courierPosition || (order.courierLat != null && order.courierLng != null ? { lat: order.courierLat, lng: order.courierLng } : null)}
                route={route?.coordinates}
                height={300}
              />
            </div>
          )}

          {/* Customer contact */}
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Клиент</p>
          <p style={{ marginBottom: '12px' }}>{customerName}</p>

          {/* Order items */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginBottom: '14px' }}>
            {items.map((item, index) => (
              <div key={item?.id || `${order?.id || 'order'}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span>{item?.product?.name || 'Товар'} × {item?.quantity || 0}</span>
                <span>{formatCurrency(asNumber(item?.product?.price) * asNumber(item?.quantity))}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '6px' }}>
              <span>Итого</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          {/* Action button */}
          {NEXT_STATUS[order.status] && (
            <button
              className="btn-success w-full"
              style={{ padding: '12px', fontSize: '15px' }}
              disabled={updating}
              onClick={updateStatus}
            >
              {updating ? 'Обновляем...' : NEXT_STATUS[order.status].label}
            </button>
          )}
        </div>
      )}

      {/* Link to completed deliveries history */}
      <button
        className="btn-outline w-full"
        style={{ marginTop: '8px' }}
        onClick={() => navigate('/courier/history')}
      >
        История доставок ({history.length})
      </button>
    </div>
  );
}
