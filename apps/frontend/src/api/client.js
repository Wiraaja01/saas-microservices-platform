import axios from 'axios';

// coba untuk NGINX sebagai reverse proxy
const API_URL = ''; 
const GATEWAY_URL = '';

// ============================================================
// Instance untuk api-service (Auth, Keys, Analytics)
// ============================================================
export const apiClient = axios.create({ baseURL: API_URL });

// Otomatis tambah JWT token ke setiap request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto logout kalau token expired
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================
// Instance untuk gateway-service (Playground / AI Proxy)
// ============================================================
export const gatewayClient = axios.create({ baseURL: GATEWAY_URL });

// ============================================================
// API Wrapper
// ============================================================
export const authApi = {
  register: (data) => apiClient.post('/api/auth/register', data),
  login: (data) => apiClient.post('/api/auth/login', data),
  me: () => apiClient.get('/api/auth/me'),
};

export const keysApi = {
  list: () => apiClient.get('/api/keys'),
  create: (data) => apiClient.post('/api/keys', data),
  revoke: (id) => apiClient.delete(`/api/keys/${id}`),
};

export const analyticsApi = {
  summary: () => apiClient.get('/api/analytics/summary'),
  daily: () => apiClient.get('/api/analytics/daily'),
};

export const playgroundApi = {
  chat: (apiKey, payload) =>
    gatewayClient.post('/v1/chat/completions', payload, {
      headers: { 'x-api-key': apiKey },
    }),
};
