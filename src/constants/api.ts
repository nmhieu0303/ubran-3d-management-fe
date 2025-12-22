export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    ME: '/auth/me',
  },
  FEATURES: {
    LIST: '/features',
    DETAIL: (id: string) => `/features/${id}`,
    CREATE: '/features',
    UPDATE: (id: string) => `/features/${id}`,
    DELETE: (id: string) => `/features/${id}`,
  },
  LAYERS: {
    LIST: '/layers',
  },
  USERS: {
    LIST: '/users',
    DETAIL: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },
};