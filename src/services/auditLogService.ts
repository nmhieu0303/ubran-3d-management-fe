/**
 * Audit Log API Service
 * Service for managing audit log operations
 *
 * Base URL: /audit-logs
 * Requires: ADMIN role for all endpoints
 */

import { api } from './api';
import type {
  AuditLogEntry,
  AuditLogResponse,
  FilterAuditLogsParams,
} from '@/types/audit.types';

export const getAuditLogs = async (
  params: FilterAuditLogsParams = {}
): Promise<AuditLogResponse> => {
  try {
    const queryParams = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.userId && { userId: params.userId }),
      ...(params.urbanObjectId && { urbanObjectId: params.urbanObjectId }),
      ...(params.action && { action: params.action }),
      ...(params.targetTable && { targetTable: params.targetTable }),
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate }),
      ...(params.sortBy && { sortBy: params.sortBy }),
      ...(params.sortOrder && { sortOrder: params.sortOrder }),
      ...(params.noPagination && { noPagination: params.noPagination }),
    };

    const response = await api.get<AuditLogResponse>('/audit-logs', { params: queryParams });
    return response.data as AuditLogResponse;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

export const getAuditLog = async (id: string): Promise<AuditLogEntry> => {
  try {
    const response = await api.get<AuditLogEntry>(`/audit-logs/${id}`);
    return response.data as AuditLogEntry;
  } catch (error) {
    console.error('Error fetching audit log:', error);
    throw error;
  }
};


export const getUserHistory = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<AuditLogResponse> => {
  try {
    const response = await api.get<AuditLogResponse>(
      `/audit-logs/user/${userId}`,
      {
        params: { page, limit },
      }
    );
    return response.data as AuditLogResponse;
  } catch (error) {
    console.error('Error fetching user history:', error);
    throw error;
  }
};

export const getObjectHistory = async (
  objectId: string,
  page: number = 1,
  limit: number = 20
): Promise<AuditLogResponse> => {
  try {
    const response = await api.get<AuditLogResponse>(
      `/audit-logs/object/${objectId}`,
      {
        params: { page, limit },
      }
    );
    return response.data as AuditLogResponse;
  } catch (error) {
    console.error('Error fetching object history:', error);
    throw error;
  }
};

export const auditLogService = {
  getAuditLogs,
  getAuditLog,
  getUserHistory,
  getObjectHistory,
};
