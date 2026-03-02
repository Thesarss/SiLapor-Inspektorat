import axios from 'axios';

// Global notification handler - will be set by the app
let globalNotificationHandler: {
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showRateLimit: (retryAfter: number) => void;
  showNetworkError: (retry?: () => void) => void;
  showAuthError: (redirectToLogin?: () => void) => void;
} | null = null;

export const setNotificationHandler = (handler: typeof globalNotificationHandler) => {
  globalNotificationHandler = handler;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for refresh tokens
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses and errors with custom notifications
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      if (globalNotificationHandler) {
        globalNotificationHandler.showNetworkError(() => {
          // Retry the original request
          return apiClient(originalRequest);
        });
      }
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Handle rate limiting
    if (status === 429) {
      const retryAfter = data?.retryAfter || 15;
      if (globalNotificationHandler) {
        globalNotificationHandler.showRateLimit(retryAfter);
      }
      return Promise.reject(error);
    }

    // Handle validation errors
    if (status === 400 && data?.error === 'Validation failed') {
      if (globalNotificationHandler) {
        const errorMessage = data.details?.map((d: any) => d.message).join(', ') || 'Data tidak valid';
        globalNotificationHandler.showError('Validasi Gagal', errorMessage);
      }
      return Promise.reject(error);
    }

    // Handle forbidden access
    if (status === 403) {
      if (globalNotificationHandler) {
        globalNotificationHandler.showError('Akses Ditolak', 'Anda tidak memiliki izin untuk mengakses resource ini.');
      }
      return Promise.reject(error);
    }

    // Handle 401 responses with automatic token refresh
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh token
        const response = await apiClient.post('/auth/refresh');
        const { token } = response.data;
        
        localStorage.setItem('token', token);
        processQueue(null, token);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Refresh failed, show auth error notification
        if (globalNotificationHandler) {
          globalNotificationHandler.showAuthError(() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          });
        } else {
          // Fallback if no notification handler
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle server errors
    if (status >= 500) {
      if (globalNotificationHandler) {
        globalNotificationHandler.showError(
          'Server Error', 
          data?.error || 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
        );
      }
      return Promise.reject(error);
    }

    // Handle other client errors
    if (status >= 400 && status < 500) {
      if (globalNotificationHandler) {
        globalNotificationHandler.showError(
          'Request Error',
          data?.error || 'Terjadi kesalahan dalam permintaan.'
        );
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
