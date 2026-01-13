

import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Polygon from '@arcgis/core/geometry/Polygon';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import { DrawingStats } from '../types/polygonDrawer.types';

export const calculatePolygonStats = (geometry: __esri.Polygon): DrawingStats => {
  try {
    const areaSquareMeters = geometryEngine.geodesicArea(geometry, 'square-meters');
    const perimeterMeters = geometryEngine.geodesicLength(geometry, 'meters');
    const pointCount = geometry.rings.reduce((sum, ring) => sum + ring.length, 0);

    return {
      area: Math.abs(areaSquareMeters),
      perimeter: Math.abs(perimeterMeters),
      pointCount,
    };
  } catch (error) {
    return { area: 0, perimeter: 0, pointCount: 0 };
  }
};


export const getBasePolygon = (polygon: __esri.Polygon): __esri.Polygon => {
  const rings = polygon.rings.map((ring) =>
    ring.map((point) => {
      if (point.length === 3) {
        return [point[0], point[1], 0];
      }
      return point;
    })
  );

  return new Polygon({
    rings,
    spatialReference: polygon.spatialReference,
    hasZ: true,
  });
};


export const applyZOffsetToPolygon = (polygon: __esri.Polygon, zOffset: number): __esri.Polygon => {
  const rings = polygon.rings.map((ring) =>
    ring.map((point) => {
      if (point.length === 3) {
        return [point[0], point[1], zOffset];
      }
      return [...point, zOffset];
    })
  );

  return new Polygon({
    rings,
    spatialReference: polygon.spatialReference,
    hasZ: true,
  });
};

export const convertToGeographic = (polygon: __esri.Polygon): __esri.Polygon => {
  if (polygon.spatialReference.isWebMercator) {
    return webMercatorUtils.webMercatorToGeographic(polygon) as __esri.Polygon;
  }
  return polygon;
};

export const extractZOffset = (polygon: __esri.Polygon): number => {
  if (polygon.rings.length > 0 && polygon.rings[0].length > 0) {
    const firstPoint = polygon.rings[0][0];
    if (firstPoint.length > 2) {
      return firstPoint[2] || 0;
    }
  }
  return 0;
};


export const parseInitialCoordinates = (initialCoordinates: any): number[][][][] | null => {
  if (!initialCoordinates || initialCoordinates.length === 0) {
    return null;
  }

  try {
    if (
      initialCoordinates.length > 0 &&
      typeof initialCoordinates[0] === 'object' &&
      initialCoordinates[0] !== null &&
      'coordinates' in initialCoordinates[0]
    ) {
      return initialCoordinates.map((item: any) => item.coordinates);
    }

    if (initialCoordinates.length > 0 && Array.isArray(initialCoordinates[0])) {
      return Array.isArray(initialCoordinates[0][0]?.[0])
        ? (initialCoordinates as number[][][][])
        : [initialCoordinates as number[][][]];
    }

    return null;
  } catch (error) {
    return null;
  }
};


export const formatNumber = (num: number): string => {
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
