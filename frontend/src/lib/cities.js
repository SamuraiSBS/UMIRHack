export const CITY_OPTIONS = [
  { value: 'Ростов-на-Дону', center: [47.2357, 39.7015], zoom: 12 },
  { value: 'Москва', center: [55.7558, 37.6176], zoom: 11 },
  { value: 'Санкт-Петербург', center: [59.9343, 30.3351], zoom: 11 },
  { value: 'Казань', center: [55.7961, 49.1064], zoom: 12 },
  { value: 'Екатеринбург', center: [56.8389, 60.6057], zoom: 12 },
  { value: 'Новосибирск', center: [55.0282, 82.9211], zoom: 12 },
];

export function getCityConfig(city) {
  return CITY_OPTIONS.find((item) => item.value === city) || CITY_OPTIONS[0];
}
