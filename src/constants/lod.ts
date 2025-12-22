export const LOD_LEVELS = {
  LOD0: 'LOD0',
  LOD1: 'LOD1',
  LOD2: 'LOD2',
  LOD3: 'LOD3',
} as const;

export type LodLevel = typeof LOD_LEVELS[keyof typeof LOD_LEVELS];

export const ALTITUDE_THRESHOLDS = {
  LOD0_MIN: 2000,
  LOD1_MIN: 1000,
  LOD2_MIN: 300,
  LOD3_MAX: 300,
} as const;