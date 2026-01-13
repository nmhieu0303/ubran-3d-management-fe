import type { UserRole } from '../types/user.types';
import { normalizeRole } from '../constants/auth';

/**
 * Permission utilities for role-based access control
 *
 * Roles hierarchy:
 * - guest: Read-only access (view objects)
 * - editor: Can view, add, edit, and delete objects
 * - admin: Full access (view, add, edit, delete + user management)
 */

/**
 * Check if user can view objects
 * All authenticated users can view
 */
export const canView = (role?: UserRole | string): boolean => {
  const normalized = normalizeRole(role as string);
  return normalized !== undefined;
};

/**
 * Check if user can add new objects
 * Only editors and admins can add
 */
export const canAdd = (role?: UserRole | string): boolean => {
  const normalized = normalizeRole(role as string);
  return normalized === 'EDITOR' || normalized === 'ADMIN';
};

/**
 * Check if user can edit objects
 * Only editors and admins can edit
 */
export const canEdit = (role?: UserRole | string): boolean => {
  const normalized = normalizeRole(role as string);
  return normalized === 'EDITOR' || normalized === 'ADMIN';
};

/**
 * Check if user can delete objects
 * Only admins can delete
 */
export const canDelete = (role?: UserRole | string): boolean => {
  const normalized = normalizeRole(role as string);
  return normalized === 'ADMIN';
};

/**
 * Get role display name
 * Handles uppercase roles from API
 */
export const getRoleDisplayName = (role?: UserRole | string): string => {
  const normalized = normalizeRole(role as string);
  const roleNames: Record<UserRole, string> = {
    GUEST: 'Guest',
    EDITOR: 'Editor',
    ADMIN: 'Admin',
  };
  return roleNames[normalized];
};

export const isAdmin = (role?: UserRole | string): boolean => {
  const normalized = normalizeRole(role as string);
  return normalized === 'ADMIN';
};


export const isEditorOrAdmin = (role?: UserRole | string): boolean => {
  const normalized = normalizeRole(role as string);
  return normalized === 'EDITOR' || normalized === 'ADMIN';
};
