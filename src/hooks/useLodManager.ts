import { useState, useEffect, useMemo } from 'react';
import { ALTITUDE_THRESHOLDS } from '../constants/lod';


export const useLodManager = (altitude: number) => {
  const [currentLod, setCurrentLod] = useState<0 | 1 | 2 | 3>(3);
  const [prevAltitude, setPrevAltitude] = useState(altitude);

  const getLodForAltitude = useMemo(() => {
    return (alt: number): 0 | 1 | 2 | 3 => {
      if (alt >= ALTITUDE_THRESHOLDS.LOD0_MIN) return 0;
      if (alt >= ALTITUDE_THRESHOLDS.LOD1_MIN) return 1;
      if (alt >= ALTITUDE_THRESHOLDS.LOD2_MIN) return 2;
      return 3;
    };
  }, []);

  const shouldUpdate = useMemo(() => {
    return (newAltitude: number): boolean => {
      const newLod = getLodForAltitude(newAltitude);
      return newLod !== currentLod;
    };
  }, [currentLod, getLodForAltitude]);


  const calculatePriority = useMemo(() => {
    return (objectAltitude: number): number => {
      const distance = Math.abs(altitude - objectAltitude);

      return Math.max(0, 100 - (distance / 50));
    };
  }, [altitude]);

  const getBufferZone = useMemo(() => {
    return (lodLevel: 0 | 1 | 2 | 3): { min: number; max: number } => {
      const bufferPercent = 0.1;

      switch (lodLevel) {
        case 0:
          return {
            min: ALTITUDE_THRESHOLDS.LOD0_MIN * (1 - bufferPercent),
            max: Infinity,
          };
        case 1:
          return {
            min: ALTITUDE_THRESHOLDS.LOD1_MIN * (1 - bufferPercent),
            max: ALTITUDE_THRESHOLDS.LOD0_MIN * (1 + bufferPercent),
          };
        case 2:
          return {
            min: ALTITUDE_THRESHOLDS.LOD2_MIN * (1 - bufferPercent),
            max: ALTITUDE_THRESHOLDS.LOD1_MIN * (1 + bufferPercent),
          };
        case 3:
          return {
            min: 0,
            max: ALTITUDE_THRESHOLDS.LOD2_MIN * (1 + bufferPercent),
          };
      }
    };
  }, []);


  useEffect(() => {
    const bufferZone = getBufferZone(currentLod);


    if (altitude < bufferZone.min || altitude > bufferZone.max) {
      const newLod = getLodForAltitude(altitude);
      if (newLod !== currentLod) {
        setCurrentLod(newLod);
      }
    }

    setPrevAltitude(altitude);
  }, [altitude, currentLod, getBufferZone, getLodForAltitude]);

  const getLodDescription = useMemo(() => {
    return (lodLevel: 0 | 1 | 2 | 3): string => {
      const descriptions = {
        0: 'Rất xa - Chỉ hiển thị điểm',
        1: 'Xa - Hình học đơn giản',
        2: 'Trung bình - Hình học vừa phải',
        3: 'Gần - Hình học chi tiết + Model 3D',
      };
      return descriptions[lodLevel];
    };
  }, []);


  const shouldLoad3DModel = useMemo(() => {
    return currentLod === 3;
  }, [currentLod]);


  const getRecommendedObjectCount = useMemo(() => {
    return (): number => {
      const counts = {
        0: 1000,
        1: 500,
        2: 200,
        3: 50,
      };
      return counts[currentLod];
    };
  }, [currentLod]);

  const formatAltitude = useMemo(() => {
    return (alt: number): string => {
      if (alt >= 1000) {
        return `${(alt / 1000).toFixed(1)}km`;
      }
      return `${Math.round(alt)}m`;
    };
  }, []);

  return {
    currentLod,
    shouldUpdate,
    getLodForAltitude,
    calculatePriority,
    getBufferZone,
    getLodDescription,
    shouldLoad3DModel,
    getRecommendedObjectCount,
    formatAltitude,
    altitudeChange: altitude - prevAltitude,
    isZoomingIn: altitude < prevAltitude,
    isZoomingOut: altitude > prevAltitude,
  };
};


export const useLodLevel = (altitude: number): 0 | 1 | 2 | 3 => {
  const { currentLod } = useLodManager(altitude);
  return currentLod;
};
