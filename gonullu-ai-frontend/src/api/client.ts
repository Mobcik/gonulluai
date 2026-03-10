import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { handleMockRequest } from './mockHandlers';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Backend bağlantı durumu
let backendAvailable: boolean | null = null;

const checkBackend = async (): Promise<boolean> => {
  try {
    await axios.get(`${BASE_URL.replace('/api', '')}/health`, { timeout: 1500 });
    return true;
  } catch {
    return false;
  }
};

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — backend yoksa mock'a yönlendir
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as AxiosRequestConfig & { _retry?: boolean; _mockRetried?: boolean };

    // 401 → token refresh
    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh });
          localStorage.setItem('token', data.access_token);
          if (config.headers) config.headers['Authorization'] = `Bearer ${data.access_token}`;
          return api(config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    // Ağ hatası → mock API devreye gir
    if (!error.response && !config._mockRetried) {
      config._mockRetried = true;

      // İlk kez kontrol et
      if (backendAvailable === null) {
        backendAvailable = await checkBackend();
      }

      if (!backendAvailable) {
        // 30 saniye sonra tekrar backend'i kontrol et (recovery)
        setTimeout(() => { backendAvailable = null; }, 30_000);

        const url    = (config.url || '').replace(BASE_URL, '');
        const method = config.method || 'get';
        let   body   = config.data;

        // FormData → parse etme (dosya yüklemede)
        if (body && typeof body === 'string') {
          try { body = JSON.parse(body); } catch { body = {}; }
        }

        try {
          const mockResult = await handleMockRequest(url, method, body);
          return {
            data:    mockResult,
            status:  200,
            headers: {},
            config,
          } as AxiosResponse;
        } catch (mockError: any) {
          if (mockError?.response) throw mockError;
          throw error;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Mock modunu zorla aç (backend yokken test için)
export const forceMockMode = () => { backendAvailable = false; };
export const resetMockMode = () => { backendAvailable = null; };
