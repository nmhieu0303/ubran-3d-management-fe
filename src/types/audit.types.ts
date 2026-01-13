/**
 * Audit Log Types
 * Type definitions for audit log system
 */

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

export interface AuditUser {
  id: string;
  email: string;
  name: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  user: AuditUser;
  action: AuditAction;
  targetTable: string;
  targetId: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  endpoint: string;
  statusCode?: number;
  reason?: string;
  urbanObjectId?: string;
  createdAt: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterAuditLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  urbanObjectId?: string;
  action?: AuditAction;
  targetTable?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  noPagination?: boolean;
}
