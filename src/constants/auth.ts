export const USER_ROLES = {
  GUEST: 'GUEST',
  EDITOR: 'EDITOR',
  ADMIN: 'ADMIN',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  'ADMIN': 'Admin',
  'EDITOR': 'Editor',
  'GUEST': 'Guest',
};

export const normalizeRole = (role: string | undefined): 'ADMIN' | 'EDITOR' | 'GUEST' => {
  if (!role) return 'GUEST';
  const normalized = role.toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'EDITOR' || normalized === 'GUEST') {
    return normalized as 'ADMIN' | 'EDITOR' | 'GUEST';
  }
  return 'GUEST';
};
