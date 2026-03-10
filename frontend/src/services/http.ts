import axios from 'axios';

function withApiPrefix(url: string): string {
  let base = url || 'http://localhost:3000';
  // remove trailing slash for consistency
  if (base.endsWith('/')) base = base.slice(0, -1);
  // append /api if not present
  if (!base.endsWith('/api')) base = base + '/api';
  return base;
}

const baseURL = withApiPrefix(import.meta.env.VITE_API_URL);
console.log('🔧 API Base URL:', baseURL, '| VITE_API_URL:', import.meta.env.VITE_API_URL);

const http = axios.create({ baseURL });

const readToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem('token') ?? localStorage.getItem('token');
  } catch (error) {
    console.warn('Nie udało się odczytać tokenu', error);
    return null;
  }
};

// Attach token automatically
http.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default http;
