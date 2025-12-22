import type { LoginCredentials, AuthResponse, User } from '../types/user.types';

const generateMockToken = (email: string): string => {
  return `mock-jwt-token-${email}-${Date.now()}`;
};

const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    avatar: 'https://via.placeholder.com/150',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'editor@example.com',
    name: 'Regular User',
    role: 'editor' as const,
    avatar: 'https://via.placeholder.com/150',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = mockUsers.find(u => u.email === credentials.email);

    if (!user || credentials.password !== 'password') {
      throw new Error('Invalid email or password');
    }

    const token = generateMockToken(credentials.email);

    return {
      user,
      token,
    };
  },

  async logout(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  },

  async verifyToken(token: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const emailMatch = token.match(/mock-jwt-token-(.+)-\d+/);
    if (!emailMatch) {
      throw new Error('Invalid token');
    }

    const email = emailMatch[1];
    const user = mockUsers.find(u => u.email === email);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },
};