import type { LoginCredentials, AuthResponse, User, ChangePasswordPayload } from '../types/user.types';
import { api } from './api';
import { API_ENDPOINTS } from '../constants/api';

interface ChangePasswordResponse {
  message: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    const data = response.data?.data as AuthResponse ?? response.data;
    return data;
  },


  async logout(): Promise<void> {
    await api.post(API_ENDPOINTS.AUTH.LOGOUT);
  },


  async getProfile(): Promise<User> {
    const response = await api.get<User>(API_ENDPOINTS.AUTH.ME);
    const user = response.data as User;

    console.log('authService.getProfile - response.data:', user);

    if (user.data && user.data.email) {
      return user.data;
    }

    return user;
  },

  async changePassword(data: ChangePasswordPayload): Promise<ChangePasswordResponse> {
    const { currentPassword, newPassword, confirmPassword } = data;
    // Validate that passwords match
    if (newPassword !== confirmPassword) {
      throw new Error('Mật khẩu xác nhận không khớp');
    }

    const response = await api.post<ChangePasswordResponse>(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      {
        currentPassword,
        newPassword,
      }
    );
    return response.data as ChangePasswordResponse;
  },


  async verifyToken(_token: string): Promise<User> {
    return this.getProfile();
  },

  async getAllUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data as User[];
  },

  async deleteUser(userId: string): Promise<boolean> {
    await api.delete(`/users/${userId}`);
    return true;
  },
};
