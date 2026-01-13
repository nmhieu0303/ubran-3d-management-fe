/**
 * Urban Object API Service
 * Real API integration for Urban Objects management
 * Based on API spec: URBAN_OBJECTS_API_FOR_FE.md
 */

import { api } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import type {
  CreateUrbanObjectRequest,
  UpdateUrbanObjectRequest,
  UrbanObjectResponse,
  UrbanObjectLodResponse,
  UrbanObjectListParams,
  PaginatedResponse,
} from '@/types/urbanObject.api.types';

function convertToFormData(
  data: CreateUrbanObjectRequest | UpdateUrbanObjectRequest
): FormData {
  const formData = new FormData();


  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (key === 'lods') {
         formData.append('lods', JSON.stringify(value));
    } else if (key === 'properties') {
      formData.append(key, JSON.stringify(value));
    }
    else if (key === 'modelTransform') {
      formData.append('model_transform', JSON.stringify(value));
    }
    else if (key === 'lod3Model' && value instanceof File) {
      formData.append('lod_3_model', value);
    } else if (typeof value === 'number') {
      formData.append(key, value.toString());
    } else {
      formData.append(key, value as string);
    }
  });

  return formData;
}


function normalizeUrbanObjectResponse(response: UrbanObjectResponse): UrbanObjectResponse {
  const normalized = { ...response };
  if (!normalized.type && (response as any).objectType?.code) {
    normalized.type = (response as any).objectType.code;
  }
  return normalized;
}

function normalizePaginatedResponse<T extends UrbanObjectResponse>(
  response: PaginatedResponse<T>
): PaginatedResponse<T> {
  return {
    ...response,
    data: response.data.map(item => normalizeUrbanObjectResponse(item)) as T[],
  };
}


class UrbanObjectApiService {

  async getAll(params?: UrbanObjectListParams): Promise<PaginatedResponse<UrbanObjectResponse>> {
    const response = await api.get<PaginatedResponse<UrbanObjectResponse>>(
      API_ENDPOINTS.URBAN_OBJECTS.LIST,
      { params }
    );
    return response.data as PaginatedResponse<UrbanObjectResponse>;
  }


  async getById(id: string): Promise<UrbanObjectResponse> {
    const response = await api.get<UrbanObjectResponse>(API_ENDPOINTS.URBAN_OBJECTS.DETAIL(id));
    return response.data as UrbanObjectResponse;
  }

  async create(data: CreateUrbanObjectRequest): Promise<UrbanObjectResponse> {
    const formData = convertToFormData(data);

    const response = await api.post<UrbanObjectResponse>(
      API_ENDPOINTS.URBAN_OBJECTS.CREATE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data as UrbanObjectResponse;
  }

  async update(id: string, data: UpdateUrbanObjectRequest): Promise<UrbanObjectResponse> {
    const formData = convertToFormData(data as any);

    const response = await api.patch<UrbanObjectResponse>(
      API_ENDPOINTS.URBAN_OBJECTS.UPDATE(id),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data as UrbanObjectResponse;
  }


  async delete(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.URBAN_OBJECTS.DELETE(id));
  }


  async getLods(urbanObjectId: string): Promise<UrbanObjectLodResponse[]> {
    const response = await api.get<UrbanObjectLodResponse[]>(
      API_ENDPOINTS.URBAN_OBJECTS.LODS(urbanObjectId)
    );
    return response.data as UrbanObjectLodResponse[];
  }

  async search(query: string, params?: Omit<UrbanObjectListParams, 'search'>) {
    return this.getAll({ ...params, search: query });
  }

  async getByBounds(
    bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
    params?: Omit<UrbanObjectListParams, 'bounds'>
  ) {
    const boundsStr = `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
    return this.getAll({ ...params, bounds: boundsStr });
  }


  async getByType(type: string, params?: Omit<UrbanObjectListParams, 'type'>) {
    return this.getAll({ ...params, type });
  }

  async getByStatus(
    status: 'active' | 'inactive' | 'archived',
    params?: Omit<UrbanObjectListParams, 'status'>
  ) {
    return this.getAll({ ...params, status });
  }


  async getAllForMap(
    params?: Omit<UrbanObjectListParams, 'noPagination'>
  ): Promise<PaginatedResponse<UrbanObjectResponse>> {
    return this.getAll({ ...params, noPagination: true });
  }

  async getByTypeCode(
    typeCode: string,
    bounds?: { minLng: number; minLat: number; maxLng: number; maxLat: number },
    status?: 'active' | 'inactive' | 'archived'
  ): Promise<PaginatedResponse<UrbanObjectResponse>> {
    const params: UrbanObjectListParams = { type: typeCode };
    if (bounds) {
      params.bounds = `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
    }
    if (status) {
      params.status = status;
    }
    return this.getAll(params);
  }

  async createWithFile(
    data: CreateUrbanObjectRequest,
    onProgress?: (percent: number) => void
  ): Promise<UrbanObjectResponse> {
    const formData = convertToFormData(data);

    const response = await api.post<UrbanObjectResponse>(
      API_ENDPOINTS.URBAN_OBJECTS.CREATE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );
    return response.data as UrbanObjectResponse;
  }

  async updateWithFile(
    id: string,
    data: UpdateUrbanObjectRequest,
    onProgress?: (percent: number) => void
  ): Promise<UrbanObjectResponse> {
    const formData = convertToFormData(data as any);

    const response = await api.patch<UrbanObjectResponse>(
      API_ENDPOINTS.URBAN_OBJECTS.UPDATE(id),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );
    return response.data as UrbanObjectResponse;
  }
}


export const urbanObjectApiService = new UrbanObjectApiService();


export default urbanObjectApiService;
