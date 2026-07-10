import axios from 'axios';
import { toast } from '../store/toastStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    let message = 'An unexpected error occurred.';

    if (error.code === 'ECONNABORTED') {
      message = 'Request timeout. Please check your internet connection.';
      toast.error(message);
      return Promise.reject(error);
    }

    if (!error.response) {
      message = 'Network error. Please check if backend is running.';
      toast.error(message);
      return Promise.reject(error);
    }

    const status = error.response.status;
    const data = error.response.data;
    message = typeof data?.detail === 'string' ? data.detail : data?.message || message;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          const newAccessToken = response.data.access_token;

          if (newAccessToken) {
            localStorage.setItem('token', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    } else if (status === 403) {
      toast.warning(message || 'Access Forbidden');
    } else if (status === 429) {
      toast.warning(message || 'Too many requests. Please slow down.');
    } else if (status === 404) {
      toast.error(message || 'Resource Not Found');
    } else if (status >= 500) {
      toast.error(message || 'Server Error. Please try again later.');
    } else {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;