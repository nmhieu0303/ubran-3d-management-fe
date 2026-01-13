import axios, { AxiosError, type AxiosResponse } from 'axios';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage');
    if (token) {
      try {
        const authData = JSON.parse(token);
        if (authData?.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      if (error.config?.url?.includes('/auth/login')) {
        const message = error.response?.data?.message || 'Email hoặc mật khẩu không chính xác';
        return Promise.reject(new Error(message));
      }

      localStorage.removeItem('auth-storage');
      window.location.href = '/map';
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      const message = error.response?.data?.message || 'Bạn không có quyền thực hiện hành động này';
      return Promise.reject(new Error(message));
    }

    if (error.response?.status === 404) {
      const message = error.response?.data?.message || 'Không tìm thấy tài nguyên';
      return Promise.reject(new Error(message));
    }

    if (error.response?.status === 409) {
      const message = error.response?.data?.message || 'Tài nguyên này đã tồn tại';
      return Promise.reject(new Error(message));
    }

    if (error.response?.status === 400) {
      const message = error.response?.data?.message || 'Dữ liệu yêu cầu không hợp lệ';
      return Promise.reject(new Error(message));
    }

    if (error.response?.status === 500) {
      const message = error.response?.data?.message || 'Có lỗi phía máy chủ';
      return Promise.reject(new Error(message));
    }

    const message = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
    return Promise.reject(new Error(message));
  }
);
