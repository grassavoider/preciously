import axios from 'axios'
import Cookies from 'js-cookie'

// Create axios instance
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001'
})

// Add auth token to requests
instance.interceptors.request.use((config) => {
  // Try cookie first, then localStorage
  const token = Cookies.get('auth_token') || localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all auth data
      Cookies.remove('auth_token');
      Cookies.remove('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance