import type { UrbanObject, Asset } from './feature.types';

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number] | [number, number, number];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][] | number[][];
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: (number[][][] | number[][])[];
}

export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSONMultiPolygon;

export interface CreateLodRequest {
  lodLevel: 0 | 1 | 2 | 3;
  enabled?: boolean;
  geom: GeoJSONGeometry | { type: string; coordinates: any };
  heights?: number[];
  modelTransform?: ModelTransformRequest;
  geometryType?: string;
}

export interface UpdateLodRequest extends Partial<CreateLodRequest> {
  id?: string;
}

export interface UrbanObjectLodResponse {
  id: string;
  urbanObjectId: string;
  lodLevel: 0 | 1 | 2 | 3;
  enabled?: boolean;
  geometryType?: string;
  geom: GeoJSONGeometry | { type: string; coordinates: any };
  heights?: number[];
  modelAsset?: Asset;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ModelTransformRequest {
  position?: [number, number, number] | { x: number; y: number; z: number };
  rotation?: [number, number, number] | { x: number; y: number; z: number };
  scale?: [number, number, number] | { x: number; y: number; z: number };
}

export interface CreateUrbanObjectRequest {
  code: string;
  name: string;
  typeId?: string;
  type?: string;
  height?: number;
  area?: number;
  address?: string;
  description?: string;
  properties?: Record<string, any>;
  modelTransform?: ModelTransformRequest;
  status?: 'active' | 'inactive' | 'archived';
  lods: CreateLodRequest[];
  lod3Model?: File;
}

export interface UpdateUrbanObjectRequest {
  name?: string;
  height?: number;
  area?: number;
  address?: string;
  description?: string;
  properties?: Record<string, any>;
  status?: 'active' | 'inactive' | 'archived';
  modelTransform?: ModelTransformRequest;
  lods?: UpdateLodRequest[];
  lod3Model?: File;
}

export interface UrbanObjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  typeId?: string;
  type?: string;
  status?: 'active' | 'inactive' | 'archived';
  bounds?: string;
  noPagination?: boolean;
}

export interface UrbanObjectResponse extends Omit<UrbanObject, 'lods'> {
  lods: UrbanObjectLodResponse[];
  modelAsset?: Asset;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore?: boolean;
}


export interface ErrorResponse {
  statusCode: number;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}


export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL_SERVER_ERROR: 500,
} as const;
