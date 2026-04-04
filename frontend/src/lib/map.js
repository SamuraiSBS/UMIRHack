import { getCityConfig } from './cities';

let leafletPromise;

function appendStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Leaflet requires a browser'));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    appendStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.body.appendChild(script);
  });

  return leafletPromise;
}

export async function reverseGeocode(lat, lng) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ru`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );
  if (!response.ok) throw new Error('Failed to reverse geocode point');
  return response.json();
}

export async function geocodeAddress(query, city) {
  const cityConfig = getCityConfig(city);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ru&q=${encodeURIComponent(`${query}, ${cityConfig.value}`)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );
  if (!response.ok) throw new Error('Failed to geocode address');
  const results = await response.json();
  const item = results[0];
  if (!item) return null;
  return {
    lat: Number(item.lat),
    lng: Number(item.lon),
    label: item.display_name,
  };
}

export async function fetchRoute(start, end) {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );
  if (!response.ok) throw new Error('Failed to build route');
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) return null;

  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

export function haversineKm(start, end) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRad(end.lat - start.lat);
  const lngDelta = toRad(end.lng - start.lng);
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
