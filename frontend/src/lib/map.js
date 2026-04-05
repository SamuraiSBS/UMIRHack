import { getCityConfig } from './cities';

let leafletPromise;
const reverseGeocodeCache = new Map();
const geocodeCache = new Map();
const DEFAULT_CENTER = [55.7558, 37.6176];

function roundCoordinate(value) {
  return Number(value).toFixed(5);
}

function readGeoPayload(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid geocoder response');
  }

  const serviceError = data.error || data.message;
  if (serviceError) {
    throw new Error(String(serviceError));
  }

  return data;
}

function appendStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function normalizePoint(point) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

export function normalizeCenter(center) {
  if (!Array.isArray(center) || center.length < 2) {
    return DEFAULT_CENTER;
  }

  const lat = Number(center[0]);
  const lng = Number(center[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return DEFAULT_CENTER;
  }

  return [lat, lng];
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
    script.onload = () => {
      if (window.L) {
        resolve(window.L);
        return;
      }

      leafletPromise = undefined;
      script.remove();
      reject(new Error('Leaflet loaded without exposing window.L'));
    };
    script.onerror = () => {
      leafletPromise = undefined;
      script.remove();
      reject(new Error('Failed to load Leaflet'));
    };
    document.body.appendChild(script);
  });

  return leafletPromise;
}

export async function reverseGeocode(lat, lng) {
  const cacheKey = `${roundCoordinate(lat)}:${roundCoordinate(lng)}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey);
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ru`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );
  if (!response.ok) throw new Error('Failed to reverse geocode point');
  const data = readGeoPayload(await response.json());
  reverseGeocodeCache.set(cacheKey, data);
  return data;
}

export async function geocodeAddress(query, city) {
  const cityConfig = getCityConfig(city);
  const cacheKey = `${cityConfig.value}:${query}`.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

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
  if (results?.error || results?.message) {
    throw new Error(String(results.error || results.message));
  }
  const item = results[0];
  if (!item) {
    geocodeCache.set(cacheKey, null);
    return null;
  }

  const resolved = {
    lat: Number(item.lat),
    lng: Number(item.lon),
    label: item.display_name,
  };
  geocodeCache.set(cacheKey, resolved);
  return resolved;
}

export async function fetchRoute(start, end) {
  const normalizedStart = normalizePoint(start);
  const normalizedEnd = normalizePoint(end);

  if (!normalizedStart || !normalizedEnd) {
    return null;
  }

  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${normalizedStart.lng},${normalizedStart.lat};${normalizedEnd.lng},${normalizedEnd.lat}?overview=full&geometries=geojson`,
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
  const coordinates = Array.isArray(route.geometry?.coordinates)
    ? route.geometry.coordinates
        .map(([lng, lat]) => [Number(lat), Number(lng)])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
    : [];

  if (!coordinates.length) {
    return null;
  }

  return {
    distanceKm: Number(route.distance) / 1000,
    durationMin: Number(route.duration) / 60,
    coordinates,
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
