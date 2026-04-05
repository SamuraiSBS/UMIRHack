import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import LeafletMap from '../../components/LeafletMap';
import { fetchRoute } from '../../lib/map';
import { asArray, asNumber, formatCurrency } from '../../lib/safeData';

const STATUS_META = {
  ACCEPTED: {
    title: 'Заказ принят',
    subtitle: 'Едете в точку выдачи, чтобы забрать заказ.',
    color: '#92400e',
    background: '#fef3c7',
  },
  DELIVERING: {
    title: 'Заказ в пути',
    subtitle: 'Везёте заказ клиенту.',
    color: '#065f46',
    background: '#d1fae5',
  },
  DONE: {
    title: 'Заказ доставлен',
    subtitle: 'Доставка завершена.',
    color: '#1f2937',
    background: '#e5e7eb',
  },
};

const NEXT_STATUS = {
  ACCEPTED: { status: 'DELIVERING', label: 'Забрал заказ' },
  DELIVERING: { status: 'DONE', label: 'Доставил заказ' },
};

function getPickupPoint(order) {
  if (order?.tradingPoint?.lat == null || order?.tradingPoint?.lng == null) {
    return null;
  }

  return {
    lat: order.tradingPoint.lat,
    lng: order.tradingPoint.lng,
  };
}

function getDeliveryPoint(order) {
  if (order?.deliveryLat == null || order?.deliveryLng == null) {
    return null;
  }

  return {
    lat: order.deliveryLat,
    lng: order.deliveryLng,
  };
}

function getServerCourierPoint(order) {
  if (order?.courierLat == null || order?.courierLng == null) {
    return null;
  }

  return {
    lat: order.courierLat,
    lng: order.courierLng,
  };
}

function getRouteStage(order) {
  if (!order) return null;
  if (order.status === 'ACCEPTED') return 'pickup';
  if (order.status === 'DELIVERING') return 'delivery';
  return null;
}

function getRouteTarget(order) {
  const stage = getRouteStage(order);
  if (stage === 'pickup') return getPickupPoint(order);
  if (stage === 'delivery') return getDeliveryPoint(order);
  return null;
}

function getRouteStart(order, courierPosition) {
  const liveCourierPoint = courierPosition || getServerCourierPoint(order);
  const stage = getRouteStage(order);

  if (stage === 'pickup') {
    return liveCourierPoint;
  }

  if (stage === 'delivery') {
    return liveCourierPoint || getPickupPoint(order);
  }

  return null;
}

function pointsEqual(first, second) {
  if (!first || !second) return false;
  return first.lat === second.lat && first.lng === second.lng;
}

function buildRouteUrl(from, to, fallbackAddress) {
  if (to) {
    if (from) {
      return `https://yandex.ru/maps/?rtext=${from.lat},${from.lng}~${to.lat},${to.lng}&rtt=auto`;
    }
    return `https://yandex.ru/maps/?ll=${to.lng},${to.lat}&z=16`;
  }
  if (fallbackAddress) {
    return `https://yandex.ru/maps/?text=${encodeURIComponent(fallbackAddress)}`;
  }
  return null;
}

export default function ActiveOrder() {
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [route, setRoute] = useState(null);
  const [courierPosition, setCourierPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Подключаем геолокацию...');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const lastSyncRef = useRef(0);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const activeOrderRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function load() {
    const requestId = ++requestIdRef.current;
    const response = await api.get('/courier/orders');
    if (!mountedRef.current || requestId !== requestIdRef.current) {
      return null;
    }

    const orders = asArray(response.data);
    const active = orders.find((item) => item?.status === 'ACCEPTED' || item?.status === 'DELIVERING') || null;
    const done = orders.filter((item) => item?.status === 'DONE');

    setOrder(active);
    setHistory(done);
    return { active, done };
  }

  useEffect(() => {
    load()
      .then(() => {
        if (mountedRef.current) {
          setError('');
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err.response?.data?.error || 'Не удалось загрузить активный заказ');
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      load().catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    activeOrderRef.current = order;
  }, [order]);

  useEffect(() => {
    const serverCourierPoint = getServerCourierPoint(order);
    if (serverCourierPoint) {
      setCourierPosition((current) => current || serverCourierPoint);
      return;
    }

    if (!order) {
      setCourierPosition(null);
    }
  }, [order?.id, order?.courierLat, order?.courierLng]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutePreview() {
      const routeStart = getRouteStart(order, courierPosition);
      const routeTarget = getRouteTarget(order);

      if (!routeStart || !routeTarget || pointsEqual(routeStart, routeTarget)) {
        setRoute(null);
        return;
      }

      try {
        const result = await fetchRoute(routeStart, routeTarget);
        if (!cancelled) {
          setRoute(result);
        }
      } catch {
        if (!cancelled) {
          setRoute(null);
        }
      }
    }

    loadRoutePreview();
    return () => {
      cancelled = true;
    };
  }, [
    courierPosition,
    order?.id,
    order?.status,
    order?.deliveryLat,
    order?.deliveryLng,
    order?.tradingPoint?.lat,
    order?.tradingPoint?.lng,
    order?.courierLat,
    order?.courierLng,
  ]);

  useEffect(() => {
    if (!order || !['ACCEPTED', 'DELIVERING'].includes(order.status)) return undefined;
    if (!navigator.geolocation) {
      setGeoStatus('Браузер не поддерживает геолокацию.');
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const currentOrder = activeOrderRef.current;
        if (!currentOrder || !['ACCEPTED', 'DELIVERING'].includes(currentOrder.status)) {
          return;
        }

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
          await api.patch(`/orders/${currentOrder.id}/location`, nextPosition);
        } catch (geoErr) {
          const status = geoErr.response?.status;
          if (status === 404 || status === 409) {
            return;
          }
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
  }, [order?.id, order?.status]);

  async function updateStatus() {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    const currentOrderId = order.id;
    setUpdating(true);
    setError('');

    try {
      const { data: updatedOrder } = await api.patch(`/orders/${currentOrderId}/status`, { status: next.status });
      if (!mountedRef.current) return;

      if (updatedOrder?.status === 'DONE') {
        setOrder(null);
        setRoute(null);
        setHistory((prev) => [updatedOrder, ...prev.filter((item) => item?.id !== updatedOrder.id)]);
        setGeoStatus('Доставка завершена.');
      } else {
        setOrder(updatedOrder);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.response?.data?.error || 'Ошибка обновления статуса');
        await load().catch(() => {});
      }
    } finally {
      if (mountedRef.current) {
        setUpdating(false);
      }
    }
  }

  function openExternalRoute() {
    const routeStart = getRouteStart(order, courierPosition);
    const routeTarget = getRouteTarget(order);
    const fallbackAddress = order?.status === 'ACCEPTED'
      ? (order?.tradingPoint?.address || order?.business?.name || '')
      : (order?.address || '');
    const routeUrl = buildRouteUrl(routeStart, routeTarget, fallbackAddress);

    if (!routeUrl) {
      setError('Не удалось построить маршрут: нет координат и адреса назначения.');
      return;
    }

    window.open(routeUrl, '_blank', 'noopener,noreferrer');
  }

  if (loading) return <div className="page"><p>Загрузка...</p></div>;

  const items = asArray(order?.items);
  const businessName = order?.business?.name || 'Заведение';
  const customerName = order?.customer?.name || order?.customer?.email || 'Клиент';
  const totalPrice = asNumber(order?.totalPrice);
  const pickupPoint = getPickupPoint(order);
  const deliveryPoint = getDeliveryPoint(order);
  const routeStage = getRouteStage(order);
  const routeTarget = getRouteTarget(order);
  const routeCenter = routeTarget
    ? [routeTarget.lat, routeTarget.lng]
    : deliveryPoint
      ? [deliveryPoint.lat, deliveryPoint.lng]
      : pickupPoint
        ? [pickupPoint.lat, pickupPoint.lng]
        : [55.7558, 37.6176];
  const routeTitle = routeStage === 'pickup' ? 'Маршрут до точки выдачи' : 'Маршрут до клиента';
  const statusMeta = STATUS_META[order?.status] || {
    title: 'Статус обновляется',
    subtitle: 'Подтягиваем текущее состояние заказа.',
    color: '#1d4ed8',
    background: '#eff6ff',
  };

  return (
    <div className="page" style={{ maxWidth: '560px' }}>
      <h1 className="page-title">Мой заказ</h1>

      {error && <div className="error-msg">{error}</div>}

      {!order ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', marginBottom: '16px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>✅</p>
          <p className="text-gray">Нет активного заказа.</p>
          <button
            className="btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => navigate('/courier/orders')}
          >
            Смотреть доступные заказы
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div
            style={{
              background: statusMeta.background,
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '14px',
            }}
          >
            <p style={{ fontWeight: 700, color: statusMeta.color, marginBottom: '4px' }}>
              {statusMeta.title}
            </p>
            <p className="text-sm" style={{ color: statusMeta.color }}>
              {statusMeta.subtitle}
            </p>
          </div>

          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Ресторан / магазин</p>
          <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '12px' }}>{businessName}</p>

          {order.tradingPoint && (
            <>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Точка выдачи</p>
              <p style={{ fontWeight: 600, marginBottom: '12px', color: '#111827' }}>
                {order.tradingPoint.name} {order.tradingPoint.address ? `— ${order.tradingPoint.address}` : ''}
              </p>
            </>
          )}

          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Адрес клиента</p>
          <p style={{ fontWeight: 600, marginBottom: '12px', color: '#111827' }}>{order.address}</p>

          <div style={{ marginBottom: '14px' }}>
            {routeTarget && (
              <div className="tracking-summary" style={{ marginBottom: '10px' }}>
                <div>
                  <strong>{routeTitle}</strong>
                  <p className="text-sm text-gray">{geoStatus}</p>
                </div>
                {route && (
                  <div style={{ textAlign: 'right' }}>
                    <strong>~{Math.max(5, Math.round(route.durationMin))} мин</strong>
                    <p className="text-sm text-gray">{route.distanceKm.toFixed(1)} км</p>
                  </div>
                )}
              </div>
            )}

            <button
              className="btn-outline w-full"
              style={{ marginBottom: routeTarget ? '10px' : '0' }}
              onClick={openExternalRoute}
            >
              Построить маршрут
            </button>

            {routeTarget && (
              <LeafletMap
                center={routeCenter}
                zoom={13}
                interactive={false}
                origin={routeStage === 'pickup' ? null : pickupPoint}
                destination={routeTarget}
                courier={courierPosition || getServerCourierPoint(order)}
                route={route?.coordinates}
                destinationLabel={routeStage === 'pickup' ? 'P' : 'C'}
                destinationPopup={routeStage === 'pickup' ? 'Точка выдачи' : 'Клиент'}
                height={300}
              />
            )}
          </div>

          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Клиент</p>
          <p style={{ marginBottom: '12px' }}>{customerName}</p>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginBottom: '14px' }}>
            {items.map((item, index) => (
              <div
                key={item?.id || `${order?.id || 'order'}-${index}`}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}
              >
                <span>{item?.product?.name || 'Товар'} × {item?.quantity || 0}</span>
                <span>{formatCurrency(asNumber(item?.product?.price) * asNumber(item?.quantity))}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '6px' }}>
              <span>Итого</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
          </div>

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
