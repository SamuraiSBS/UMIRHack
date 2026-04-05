import { useEffect, useRef, useState } from 'react';
import { loadLeaflet, normalizeCenter, normalizePoint } from '../lib/map';

function createMarkerIcon(L, className, label) {
  return L.divIcon({
    className: 'leaflet-div-icon-reset',
    html: `<div class="map-pin ${className}">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function normalizeRoutePoint(point) {
  if (!Array.isArray(point) || point.length < 2) {
    return null;
  }

  const lat = Number(point[0]);
  const lng = Number(point[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return [lat, lng];
}

export default function LeafletMap({
  center,
  zoom = 12,
  interactive = true,
  onMapClick,
  origin,
  destination,
  courier,
  route,
  height = 320,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const interactiveRef = useRef(interactive);
  const onMapClickRef = useRef(onMapClick);
  const [leaflet, setLeaflet] = useState(null);
  const [mapError, setMapError] = useState('');
  const normalizedCenter = normalizeCenter(center);
  const normalizedOrigin = normalizePoint(origin);
  const normalizedDestination = normalizePoint(destination);
  const normalizedCourier = normalizePoint(courier);
  const normalizedRoute = Array.isArray(route)
    ? route
        .map(normalizeRoutePoint)
        .filter(Boolean)
    : [];

  useEffect(() => {
    interactiveRef.current = interactive;
    onMapClickRef.current = onMapClick;
  }, [interactive, onMapClick]);

  useEffect(() => {
    let mounted = true;

    setMapError('');
    loadLeaflet()
      .then((L) => {
        if (!mounted || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView(normalizedCenter, zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        map.on('click', (event) => {
          if (!interactiveRef.current || !onMapClickRef.current) return;
          onMapClickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
        });

        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setLeaflet(L);
      })
      .catch(() => {
        if (mounted) {
          setMapError('Не удалось загрузить карту. Проверьте соединение и обновите страницу.');
        }
      });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(normalizedCenter, zoom);
  }, [normalizedCenter, zoom]);

  useEffect(() => {
    if (!leaflet || !mapRef.current || !layerRef.current) return;

    const L = leaflet;
    const layer = layerRef.current;
    layer.clearLayers();
    const bounds = [];

    if (normalizedRoute.length) {
      const polyline = L.polyline(normalizedRoute, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.8,
      }).addTo(layer);
      bounds.push(...polyline.getLatLngs());
    }

    if (normalizedOrigin) {
      const marker = L.marker([normalizedOrigin.lat, normalizedOrigin.lng], {
        icon: createMarkerIcon(L, 'map-pin-origin', 'B'),
      }).addTo(layer);
      marker.bindPopup('Бизнес');
      bounds.push(marker.getLatLng());
    }

    if (normalizedDestination) {
      const marker = L.marker([normalizedDestination.lat, normalizedDestination.lng], {
        icon: createMarkerIcon(L, 'map-pin-destination', 'C'),
      }).addTo(layer);
      marker.bindPopup('Клиент');
      bounds.push(marker.getLatLng());
    }

    if (normalizedCourier) {
      const marker = L.marker([normalizedCourier.lat, normalizedCourier.lng], {
        icon: createMarkerIcon(L, 'map-pin-courier', 'K'),
      }).addTo(layer);
      marker.bindPopup('Курьер');
      bounds.push(marker.getLatLng());
    }

    if (bounds.length > 1) {
      mapRef.current.fitBounds(L.latLngBounds(bounds), { padding: [24, 24] });
    }
  }, [leaflet, normalizedOrigin, normalizedDestination, normalizedCourier, normalizedRoute]);

  if (mapError) {
    return (
      <div
        className="map-shell"
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          textAlign: 'center',
          color: '#6b7280',
          background: '#f8fafc',
        }}
      >
        {mapError}
      </div>
    );
  }

  return <div ref={containerRef} className="map-shell" style={{ height }} />;
}
