export type UserRole = 'ADMIN' | 'EDITOR' | 'GUEST';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface Role {
  id: string;
  code: UserRole;
  name: string;
}

export interface UserResponse {
  data: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
  roleCode?: UserRole;
  status: UserStatus;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  deletedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// User management types
export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUserResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  name?: string;
  status?: UserStatus;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  name?: string;
  status?: UserStatus;
}

export interface ChangeStatusRequest {
  status: UserStatus;
  reason?: string;
}

// Change history types
export type ChangeType = 'create' | 'update' | 'delete';
export type EntityType = 'urban_object' | 'user' | 'attachment' | 'model';

export interface ChangeHistory {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  changeType: ChangeType;
  userId: string;
  userName: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  timestamp: string;
  description?: string;
}

export interface ChangeHistoryFilters {
  entityType?: EntityType;
  changeType?: ChangeType;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
