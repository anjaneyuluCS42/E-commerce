import axios from 'axios';
import { toast } from '../store/toastStore';

import { API_BASE_URL } from '../constants';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
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
    // Set timer to show a friendly wake-up message if the request takes more than 4.5 seconds
    config.wakeUpTimeout = setTimeout(() => {
      toast.info('Connecting to server... (The backend might be booting up from sleep, please wait up to 1 minute)');
    }, 4500);
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Clear the wake-up timeout
    if (response.config && response.config.wakeUpTimeout) {
      clearTimeout(response.config.wakeUpTimeout);
    }
    return response;
  },
  async (error) => {
    // Clear the wake-up timeout
    if (error.config && error.config.wakeUpTimeout) {
      clearTimeout(error.config.wakeUpTimeout);
    }
    const originalRequest = error.config;
    const skipToast = originalRequest?.skipToast || error.config?.skipToast;
    let message = 'An unexpected error occurred.';

    if (error.code === 'ECONNABORTED') {
      message = 'Request timeout. Please check your internet connection.';
      if (!skipToast) toast.error(message);
      return Promise.reject(error);
    }

    if (!error.response) {
      message = 'Network error. Please check if backend is running.';
      if (!skipToast) toast.error(message);
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
      if (!skipToast) toast.warning(message || 'Access Forbidden');
    } else if (status === 429) {
      if (!skipToast) toast.warning(message || 'Too many requests. Please slow down.');
    } else if (status === 404) {
      if (!skipToast) toast.error(message || 'Resource Not Found');
    } else if (status >= 500) {
      if (!skipToast) toast.error(message || 'Server Error. Please try again later.');
    } else {
      if (!skipToast) toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;