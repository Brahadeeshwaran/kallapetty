import axios from 'axios';

// Dynamically determine the backend URL based on the frontend's current hostname
const getBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  const hostname = window.location.hostname; // e.g., 'localhost' or '192.168.1.4'
  return `${window.location.protocol}//${hostname}:3000/api`;
}

export const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true, // Crucial for HttpOnly cookies
});

let currentAccessToken = '';

export const setAccessToken = (token: string) => {
  currentAccessToken = token;
};

// 1. Attach Access Token to every request
api.interceptors.request.use((config) => {
  if (currentAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

// 2. Automatically Refresh Token if 401 is received
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If auth failed and we haven't already tried retrying
      if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
        originalRequest._retry = true;
        try {
          // Attempt to get a new access token using the HttpOnly cookie
          const res = await axios.post(`${getBaseUrl()}/auth/refresh`, {}, { withCredentials: true });
          
          // Update memory and headers
          setAccessToken(res.data.token);
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
          
          // Retry the original failed request
          return api(originalRequest);
      } catch (refreshError) {
        // The refresh token is also dead/expired. We must log out.
        window.dispatchEvent(new Event('auth-failed'));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
