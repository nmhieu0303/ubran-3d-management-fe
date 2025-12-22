export type FeatureType = 'building' | 'tree' | 'road' | 'utility' | 'bridge' | 'camera';

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
    [key: string]: any;
  };
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface FeatureFilter {
  type?: FeatureType;
  search?: string;
  status?: string;
}
