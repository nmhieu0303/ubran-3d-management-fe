export const FEATURE_TYPES = {
  BUILDING: 'building',
  TREE: 'tree',
  ROAD: 'road',
  UTILITY: 'utility',
  BRIDGE: 'bridge',
  OTHER: 'other',
} as const;

export const FEATURE_TYPE_LABELS: Record<string, string> = {
  building: 'Toà nhà',
  tree: 'Cây xanh',
  road: 'Đường',
  utility: 'Tiện ích',
  bridge: 'Cầu',
  other: 'Khác',
};