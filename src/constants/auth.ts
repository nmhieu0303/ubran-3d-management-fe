export const USER_ROLES = {
  GUEST: 'guest',
  EDITOR: 'editor',
  ADMIN: 'admin',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  guest: 'Khách',
  editor: 'Biên tập viên',
  admin: 'Quản trị viên',
};