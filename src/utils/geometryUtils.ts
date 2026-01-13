export const isValidHCMCoordinates = (lon: number, lat: number): boolean => {
  return (
    lon >= 106.3 &&
    lon <= 107.0 &&
    lat >= 10.3 &&
    lat <= 11.2
  );
};

export const isPolygonClosed = (coordinates: number[][][]): boolean => {
  if (!coordinates || coordinates.length === 0) return false;

  const ring = coordinates[0];
  if (ring.length < 4) return false;

  const first = ring[0];
  const last = ring[ring.length - 1];

  return first[0] === last[0] && first[1] === last[1];
};


export const calculateDistance = (
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const calculatePolygonArea = (coordinates: number[][]): number => {
  if (!coordinates || coordinates.length < 3) return 0;

  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }

  return Math.abs(area / 2) * 111319.9 * 111319.9;
};


export const calculatePolygonPerimeter = (coordinates: number[][]): number => {
  if (!coordinates || coordinates.length < 2) return 0;

  let perimeter = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    perimeter += calculateDistance(lon1, lat1, lon2, lat2);
  }

  return perimeter;
};

export const calculateCentroid = (coordinates: number[][]): [number, number] => {
  if (!coordinates || coordinates.length === 0) return [0, 0];

  let sumX = 0;
  let sumY = 0;

  coordinates.forEach(([lon, lat]) => {
    sumX += lon;
    sumY += lat;
  });

  return [sumX / coordinates.length, sumY / coordinates.length];
};

export const isPointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
};

export const simplifyPolygon = (
  coordinates: number[][],
  tolerance: number = 0.0001
): number[][] => {
  if (coordinates.length <= 2) return coordinates;

  const sqTolerance = tolerance * tolerance;

  const simplified = [coordinates[0]];
  let prev = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const dx = coordinates[i][0] - coordinates[prev][0];
    const dy = coordinates[i][1] - coordinates[prev][1];

    if (dx * dx + dy * dy > sqTolerance) {
      simplified.push(coordinates[i]);
      prev = i;
    }
  }

  if (simplified[simplified.length - 1] !== coordinates[coordinates.length - 1]) {
    simplified.push(coordinates[coordinates.length - 1]);
  }

  return simplified;
};

export const toGeoJSON = (type: 'Point' | 'LineString' | 'Polygon', coordinates: any) => {
  return {
    type: 'Feature',
    geometry: {
      type,
      coordinates,
    },
    properties: {},
  };
};

export const getBoundingBox = (coordinates: number[][]) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  coordinates.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  });

  return {
    xmin: minLon,
    ymin: minLat,
    xmax: maxLon,
    ymax: maxLat,
  };
};

export const formatCoordinates = (lon: number, lat: number): string => {
  return `${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E`;
};

export const validateGeometry = (geometry: {
  type: string;
  coordinates: any;
}): { valid: boolean; error?: string } => {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return { valid: false, error: 'Invalid geometry structure' };
  }

  switch (geometry.type) {
    case 'Point':
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 2) {
        return { valid: false, error: 'Point must have 2 coordinates [lon, lat]' };
      }
      const [lon, lat] = geometry.coordinates;
      if (!isValidHCMCoordinates(lon, lat)) {
        return { valid: false, error: 'Coordinates outside HCM area' };
      }
      break;

    case 'LineString':
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
        return { valid: false, error: 'LineString must have at least 2 points' };
      }
      break;

    case 'Polygon':
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
        return { valid: false, error: 'Polygon must have at least one ring' };
      }
      if (!isPolygonClosed(geometry.coordinates)) {
        return { valid: false, error: 'Polygon must be closed' };
      }
      break;

    default:
      return { valid: false, error: `Unsupported geometry type: ${geometry.type}` };
  }

  return { valid: true };
};


export interface Transform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export const translateCoordinates = (
  coordinates: number[][],
  dx: number,
  dy: number
): number[][] => {
  return coordinates.map(([lon, lat]) => [lon + dx, lat + dy]);
};


export const rotateCoordinates = (
  coordinates: number[][],
  center: [number, number],
  angle: number
): number[][] => {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const [cx, cy] = center;

  return coordinates.map(([lon, lat]) => {
    const dx = lon - cx;
    const dy = lat - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  });
};

export const scaleCoordinates = (
  coordinates: number[][],
  center: [number, number],
  scaleX: number,
  scaleY: number
): number[][] => {
  const [cx, cy] = center;

  return coordinates.map(([lon, lat]) => {
    const dx = lon - cx;
    const dy = lat - cy;
    return [cx + dx * scaleX, cy + dy * scaleY];
  });
};

export const applyTransformToPolygon = (
  coordinates: number[][][],
  transform: Transform,
  originalCenter?: [number, number]
): number[][][] => {
  const center = originalCenter || calculateCentroid(coordinates[0]);

  return coordinates.map((ring) => {
    let transformedRing = ring;

    if (transform.scale.x !== 1 || transform.scale.y !== 1) {
      transformedRing = scaleCoordinates(
        transformedRing,
        center,
        transform.scale.x,
        transform.scale.y
      );
    }

    if (transform.rotation.z !== 0) {
      transformedRing = rotateCoordinates(transformedRing, center, transform.rotation.z);
    }

    if (transform.position.x !== 0 || transform.position.y !== 0) {
      transformedRing = translateCoordinates(
        transformedRing,
        transform.position.x,
        transform.position.y
      );
    }

    return transformedRing;
  });
};

export const applyTransformToPoint = (
  coordinates: [number, number],
  transform: Transform,
  center?: [number, number]
): [number, number] => {
  const rotationCenter = center || coordinates;
  let [x, y] = coordinates;

  if (transform.scale.x !== 1 || transform.scale.y !== 1) {
    const [cx, cy] = rotationCenter;
    const dx = x - cx;
    const dy = y - cy;
    x = cx + dx * transform.scale.x;
    y = cy + dy * transform.scale.y;
  }

  if (transform.rotation.z !== 0) {
    const [cx, cy] = rotationCenter;
    const dx = x - cx;
    const dy = y - cy;
    const radians = (transform.rotation.z * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    x = cx + dx * cos - dy * sin;
    y = cy + dx * sin + dy * cos;
  }

  return [x + transform.position.x, y + transform.position.y];
};

export const applyTransformToLineString = (
  coordinates: number[][],
  transform: Transform,
  originalCenter?: [number, number]
): number[][] => {
  const center = originalCenter || calculateCentroid(coordinates);

  let transformedCoords = coordinates;

  if (transform.scale.x !== 1 || transform.scale.y !== 1) {
    transformedCoords = scaleCoordinates(
      transformedCoords,
      center,
      transform.scale.x,
      transform.scale.y
    );
  }

  if (transform.rotation.z !== 0) {
    transformedCoords = rotateCoordinates(transformedCoords, center, transform.rotation.z);
  }

  if (transform.position.x !== 0 || transform.position.y !== 0) {
    transformedCoords = translateCoordinates(
      transformedCoords,
      transform.position.x,
      transform.position.y
    );
  }

  return transformedCoords;
};
