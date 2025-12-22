import type { Feature } from '../types/feature.types';
import type { User } from '../types/user.types';

export const mockUser: User = {
  id: '1',
  email: 'admin@urban3d.com',
  name: 'Admin User',
  role: 'admin',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockFeatures: Feature[] = [
  {
    id: 'BLD-001',
    name: 'Toà nhà A-123',
    code: 'BLD-001',
    type: 'building',
    geometry: {
      type: 'Point',
      coordinates: [106.7, 10.8],
    },
    properties: {
      height: 45.5,
      area: 2500,
      material: 'Concrete & Steel',
      yearBuilt: 2015,
      floors: 12,
      owner: 'City Development Corp',
      status: 'Active',
    },
    attachments: [
      {
        id: 'att-1',
        name: 'facade.jpg',
        url: '/attachments/facade.jpg',
        type: 'image/jpeg',
        size: 2048000,
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'att-2',
        name: 'floor_plan.pdf',
        url: '/attachments/floor_plan.pdf',
        type: 'application/pdf',
        size: 5120000,
        uploadedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TR-034',
    name: 'Park Cây xanh Group',
    code: 'TR-034',
    type: 'tree',
    geometry: {
      type: 'Point',
      coordinates: [106.71, 10.81],
    },
    properties: {
      area: 1500,
      status: 'Active',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'UTL-012',
    name: 'Utility Pole 12',
    code: 'UTL-012',
    type: 'utility',
    geometry: {
      type: 'Point',
      coordinates: [106.72, 10.79],
    },
    properties: {
      height: 8,
      status: 'Active',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'BLD-002',
    name: 'Toà nhà B-456',
    code: 'BLD-002',
    type: 'building',
    geometry: {
      type: 'Point',
      coordinates: [106.69, 10.82],
    },
    properties: {
      height: 60,
      area: 3200,
      material: 'Steel & Glass',
      yearBuilt: 2018,
      floors: 15,
      owner: 'Modern Corp',
      status: 'Active',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockLayers = [
  {
    id: 'buildings',
    name: 'Toà nhà',
    type: 'building-scene-layer',
    visible: true,
  },
  {
    id: 'trees',
    name: 'Cây xanh',
    type: 'feature-layer',
    visible: true,
  },
  {
    id: 'roads',
    name: 'Đường',
    type: 'feature-layer',
    visible: true,
  },
  {
    id: 'utilities',
    name: 'Tiện ích',
    type: 'feature-layer',
    visible: false,
  },
];
