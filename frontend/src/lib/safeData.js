export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatCurrency(value, digits = 0) {
  return `${asNumber(value).toFixed(digits)} ₽`;
}

export function formatDate(value, locale = 'ru-RU', options) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString(locale, options);
}

export function shortId(value, fallback = '—') {
  return typeof value === 'string' && value.length >= 6
    ? value.slice(-6).toUpperCase()
    : fallback;
}
