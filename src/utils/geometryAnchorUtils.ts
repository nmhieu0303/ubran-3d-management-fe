import { Point } from '@arcgis/core/geometry';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';

export const getPolygonCentroid = (polygon: __esri.Polygon): Point => {
  try {
    const rings = polygon.rings[0];

    if (!rings || rings.length === 0) {
      throw new Error('Polygon has no rings');
    }

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let hasZ = false;

    rings.forEach(([x, y, z]) => {
      sumX += x;
      sumY += y;
      if (z !== undefined) {
        sumZ += z;
        hasZ = true;
      }
    });

    const centerX = sumX / rings.length;
    const centerY = sumY / rings.length;
    const centerZ = hasZ ? sumZ / rings.length : 0;

    return new Point({
      x: centerX,
      y: centerY,
      z: centerZ,
      spatialReference: polygon.spatialReference,
    });
  } catch (error) {
    console.error('Error calculating polygon centroid:', error);
    const extent = polygon.extent;
    if (!extent) {
      return new Point({
        x: 0,
        y: 0,
        z: 0,
        spatialReference: polygon.spatialReference,
      });
    }
    return new Point({
      x: extent.center.x,
      y: extent.center.y,
      z: 0,
      spatialReference: polygon.spatialReference,
    });
  }
};

export const getPolylineMidpoint = (polyline: __esri.Polyline): Point => {
  try {
    const paths = polyline.paths[0];

    if (!paths || paths.length === 0) {
      throw new Error('Polyline has no paths');
    }

    const midIndex = Math.floor(paths.length / 2);
    const [x, y, z] = paths[midIndex];

    return new Point({
      x,
      y,
      z: z ?? 0,
      spatialReference: polyline.spatialReference,
    });
  } catch (error) {
    console.error('Error calculating polyline midpoint:', error);
    const extent = polyline.extent;
    if (!extent) {
      return new Point({
        x: 0,
        y: 0,
        z: 0,
        spatialReference: polyline.spatialReference,
      });
    }
    return new Point({
      x: extent.center.x,
      y: extent.center.y,
      z: 0,
      spatialReference: polyline.spatialReference,
    });
  }
};

export const getAnchorPointFromGeometry = (
  geometry: __esri.Geometry | undefined,
  geometryType: string
): Point | null => {
  if (!geometry) return null;

  try {
    switch (geometryType) {
      case 'Point':
        return geometry as Point;

      case 'LineString':
      case 'Polyline':
        if (geometry.type === 'polyline') {
          return getPolylineMidpoint(geometry as __esri.Polyline);
        }
        break;

      case 'Polygon':
        if (geometry.type === 'polygon') {
          return getPolygonCentroid(geometry as __esri.Polygon);
        }
        break;

      case 'MultiPolygon':
        if (geometry.type === 'polygon') {
          return getPolygonCentroid(geometry as __esri.Polygon);
        }
        break;

      default:
        return null;
    }

    return null;
  } catch (error) {
    console.error('Error getting anchor point from geometry:', error);
    return null;
  }
};

export const ensureGeographicPoint = (point: Point): Point => {
  if (point.spatialReference?.isWebMercator) {
    return webMercatorUtils.webMercatorToGeographic(point) as Point;
  }
  return point;
};

export const formatPointCoordinates = (point: Point | null): string => {
  if (!point) return 'No anchor point';

  const geoPoint = ensureGeographicPoint(point);
  return `[${geoPoint.x.toFixed(6)}, ${geoPoint.y.toFixed(6)}, ${(geoPoint.z ?? 0).toFixed(2)}]`;
};
