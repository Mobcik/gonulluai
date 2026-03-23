import axios, { type AxiosRequestConfig } from 'axios';

/** Vite: gonullu-ai-frontend/.env içinde VITE_API_URL=http://localhost:8000/api */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/** Paylaşım / OG sayfası: /api olmadan kök (örn. http://localhost:8000) */
const API_ORIGIN = BASE_URL.replace(/\/api\/?$/i, '') || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async error => {
    const config = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh }, { timeout: 15_000 });
          localStorage.setItem('token', data.access_token);
          if (config.headers) config.headers.Authorization = `Bearer ${data.access_token}`;
          return api(config);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL, API_ORIGIN };
