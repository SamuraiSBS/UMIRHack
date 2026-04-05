import { useEffect, useRef, useState } from 'react';
import { loadLeaflet } from '../lib/map';

function createMarkerIcon(L, className, label) {
  return L.divIcon({
    className: 'leaflet-div-icon-reset',
    html: `<div class="map-pin ${className}">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
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
  const [leaflet, setLeaflet] = useState(null);

  useEffect(() => {
    let mounted = true;

    loadLeaflet()
      .then((L) => {
        if (!mounted || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView(center, zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        if (interactive && onMapClick) {
          map.on('click', (event) => {
            onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
          });
        }

        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setLeaflet(L);
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, interactive, onMapClick]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!leaflet || !mapRef.current || !layerRef.current) return;

    const L = leaflet;
    const layer = layerRef.current;
    layer.clearLayers();
    const bounds = [];

    if (route?.length) {
      const polyline = L.polyline(route, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.8,
      }).addTo(layer);
      bounds.push(...polyline.getLatLngs());
    }

    if (origin) {
      const marker = L.marker([origin.lat, origin.lng], {
        icon: createMarkerIcon(L, 'map-pin-origin', 'B'),
      }).addTo(layer);
      marker.bindPopup('Бизнес');
      bounds.push(marker.getLatLng());
    }

    if (destination) {
      const marker = L.marker([destination.lat, destination.lng], {
        icon: createMarkerIcon(L, 'map-pin-destination', 'C'),
      }).addTo(layer);
      marker.bindPopup('Клиент');
      bounds.push(marker.getLatLng());
    }

    if (courier) {
      const marker = L.marker([courier.lat, courier.lng], {
        icon: createMarkerIcon(L, 'map-pin-courier', 'K'),
      }).addTo(layer);
      marker.bindPopup('Курьер');
      bounds.push(marker.getLatLng());
    }

    if (bounds.length > 1) {
      mapRef.current.fitBounds(L.latLngBounds(bounds), { padding: [24, 24] });
    }
  }, [leaflet, origin, destination, courier, route]);

  return <div ref={containerRef} className="map-shell" style={{ height }} />;
}
