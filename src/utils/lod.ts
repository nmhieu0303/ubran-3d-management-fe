import { LOD_LEVELS, ALTITUDE_THRESHOLDS, type LodLevel } from '../constants/lod';

export const getLodLevelFromAltitude = (altitude: number): LodLevel => {
  if (altitude > ALTITUDE_THRESHOLDS.LOD0_MIN) {
    return LOD_LEVELS.LOD0;
  } else if (altitude >= ALTITUDE_THRESHOLDS.LOD1_MIN) {
    return LOD_LEVELS.LOD1;
  } else if (altitude >= ALTITUDE_THRESHOLDS.LOD2_MIN) {
    return LOD_LEVELS.LOD2;
  } else {
    return LOD_LEVELS.LOD3;
  }
};