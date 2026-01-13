import type {
  ChangeHistory,
  ChangeHistoryFilters,
  CreateUserData,
  PaginatedUserResponse,
  UpdateUserData,
  User,
  UserFilters,
  UserStatus,
  ChangePasswordPayload,
} from '../types/user.types';
import { api } from './api';

interface PaginationParams {
  page: number;
  limit: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

interface UserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

class UserManagementService {
  private baseURL = '/users';

  async getUsers(
    filters?: UserFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedUserResponse> {
    try {
      const params: UserFilterParams = {
        page: pagination?.page || 1,
        limit: pagination?.limit || 20,
        ...(filters?.search && { search: filters.search }),
        ...(filters?.role && { role: filters.role }),
        ...(filters?.status && { status: filters.status }),
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const response = await api.get<PaginatedUserResponse>(this.baseURL, { params });
      return response.data as PaginatedUserResponse;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const response = await api.get(`${this.baseURL}/${id}`);
      return response.data?.data as User;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }

  async createUser(data: CreateUserData): Promise<User> {
    try {
      const response = await api.post<User>(this.baseURL, {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role || 'GUEST',
        status: data.status || 'active',
      });
      return response.data as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    try {
      const response = await api.patch<User>(`${this.baseURL}/${id}`, data);
      return response.data as User;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await api.delete(`${this.baseURL}/${id}`);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  async updateUserStatus(id: string, status: UserStatus, reason?: string): Promise<User> {
    try {
      const payload: { status: UserStatus; reason?: string } = { status };
      if (reason) {
        payload.reason = reason;
      }
      const response = await api.patch<User>(`${this.baseURL}/${id}/status`, payload);
      return response.data as User;
    } catch (error) {
      console.error(`Error updating user status ${id}:`, error);
      throw error;
    }
  }


  async changePassword(data: ChangePasswordPayload): Promise<void> {
    try {
      await api.post('/auth/change-password', data);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  async getChangeHistory(
    filters?: ChangeHistoryFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ChangeHistory>> {
    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // const params = {
      //   page: pagination?.page || 1,
      //   limit: pagination?.limit || 10,
      //   ...(filters?.entityType && { entityType: filters.entityType }),
      //   ...(filters?.changeType && { changeType: filters.changeType }),
      //   ...(filters?.userId && { userId: filters.userId }),
      //   ...(filters?.startDate && { startDate: filters.startDate }),
      //   ...(filters?.endDate && { endDate: filters.endDate }),
      //   ...(filters?.search && { search: filters.search }),
      // };
      // const response = await api.get('/change-history', { params });
      // return response.data;

      return {
        data: [],
        total: 0,
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    } catch (error) {
      console.error('Error fetching change history:', error);
      throw error;
    }
  }

  async getChangeHistoryById(id: string): Promise<ChangeHistory> {
    try {
      // TODO: Replace with actual API endpoint when backend is ready
      throw new Error('Not implemented yet');
    } catch (error) {
      console.error(`Error fetching change history ${id}:`, error);
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();
