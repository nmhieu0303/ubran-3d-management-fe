export type FeatureType = 'building' | 'tree' | 'road' | 'utility' | 'bridge' | 'camera';

export interface Asset {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  urbanObjectId?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | string;
  description?: string;
  uploadedById: string;
  uploadedAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface UrbanObjectType {
  id: string;
  code: string;
  name: string;
  description?: string;
  default_properties?: Record<string, any>;
  icon_url?: string;
}


export interface ModelTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface UrbanObject {
  id: string;
  code: string;
  name: string;
  typeId?: string;
  type?: string;
  properties?: Record<string, any>;
  modelTransform?: ModelTransform;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: string;

  height?: number;
  area?: number;
  address?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';

  typeRelation?: UrbanObjectType;
  lods?: UrbanObjectLod[];
  attachments?: Attachment[];
  modelAsset?: Asset;
}

export interface UrbanObjectLod {
  id: string;
  urbanObjectId: string;
  lodLevel: 0 | 1 | 2 | 3;
  enabled?: boolean;
  geometryType?: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon' | string;
  geom: {
    type: string;
    coordinates: any;
  };
  heights?: number[];
  modelAsset?: Asset;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  urbanObjectId: string;
  action: string;
  targetTable: string;
  targetId: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  endpoint?: string;
  statusCode?: number;
  createdAt: string;
}


export interface Feature {
  id: string;
  name: string;
  code: string;
  type: FeatureType;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    height?: number;
    area?: number;
    material?: string;
    yearBuilt?: number;
    floors?: number;
    owner?: string;
    status?: string;
    lod?: string;
    lodLevel?: number;
    [key: string]: any;
  };
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface FeatureFilter {
  type?: FeatureType;
  search?: string;
  status?: string;
  lodLevel?: number;
}
