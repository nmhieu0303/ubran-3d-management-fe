export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
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
  URBAN_OBJECTS: {
    LIST: '/urban-objects',
    CREATE: '/urban-objects',
    DETAIL: (id: string) => `/urban-objects/${id}`,
    UPDATE: (id: string) => `/urban-objects/${id}`,
    DELETE: (id: string) => `/urban-objects/${id}`,
    LODS: (id: string) => `/urban-objects/${id}/lods`,
    LOD_DETAIL: (id: string, lodId: string) => `/urban-objects/${id}/lods/${lodId}`,
    TYPES_DROPDOWN: '/urban-objects/types/dropdown',
  },
};
