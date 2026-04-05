import axios from 'axios';

const apiBaseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'https://umirhack-backend.onrender.com/api');

const api = axios.create({
  baseURL: apiBaseURL,
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 clear token (expired/invalid)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(err);
  }
);

export default api;
