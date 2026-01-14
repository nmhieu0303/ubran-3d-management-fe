export interface MultiPolygonBlockInput {
  coordinates: number[][][];
  height: number;
}

export interface ParsedLodData {
  coordinates: number[][][][];
  heights: number[];
  geometry_type: 'MultiPolygon';
}


export function parseMultiPolygonWithHeights(input: string): ParsedLodData | null {
  try {
    const parsed = JSON.parse(input);

    if (!Array.isArray(parsed)) {
      throw new Error('Input must be an array of polygon blocks');
    }

    const coordinates: number[][][][] = [];
    const heights: number[] = [];

    for (const block of parsed as MultiPolygonBlockInput[]) {
      if (!block.coordinates || block.height === undefined) {
        throw new Error('Each block must have coordinates and height properties');
      }

      const cleanedCoordinates: number[][][] = block.coordinates.map(
        (ring: number[][]) => ring.map((point: number[]) =>
          point.length > 2 ? [point[0], point[1], point[2]] : [point[0], point[1]]
        )
      );

      coordinates.push(cleanedCoordinates);
      heights.push(block.height);
    }

    return {
      coordinates,
      heights,
      geometry_type: 'MultiPolygon',
    };
  } catch (error) {
    console.error('Failed to parse MultiPolygon with heights:', error);
    return null;
  }
}


export function formatMultiPolygonWithHeights(
  coordinates: number[][][][],
  heights?: number[]
): string {
  try {
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return '';
    }

    const blocks = coordinates.map((polygon: number[][][], index: number) => {

      const coordsWithZ: number[][][] = polygon.map((ring: number[][]) =>
        ring.map((point: number[]) =>
          point.length > 2 ? [...point] : [...point, 0]
        )
      );

      return {
        coordinates: coordsWithZ,
        height: heights?.[index] ?? 0,
      };
    });

    return JSON.stringify(blocks, null, 2);
  } catch (error) {
    console.error('Failed to format MultiPolygon with heights:', error);
    return '';
  }
}

export function validateMultiPolygonInput(input: string): {
  valid: boolean;
  error?: string;
} {
  if (!input || input.trim() === '') {
    return { valid: false, error: 'Input is empty' };
  }

  try {
    const parsed = JSON.parse(input);

    if (!Array.isArray(parsed)) {
      return { valid: false, error: 'Input must be an array' };
    }

    for (let i = 0; i < parsed.length; i++) {
      const block = parsed[i];

      if (!block.coordinates) {
        return { valid: false, error: `Block ${i}: missing coordinates property` };
      }

      if (block.height === undefined) {
        return { valid: false, error: `Block ${i}: missing height property` };
      }

      if (!Array.isArray(block.coordinates)) {
        return { valid: false, error: `Block ${i}: coordinates must be an array` };
      }

      if (typeof block.height !== 'number') {
        return { valid: false, error: `Block ${i}: height must be a number` };
      }

      if (block.coordinates.length === 0) {
        return { valid: false, error: `Block ${i}: coordinates array is empty` };
      }

      for (let j = 0; j < block.coordinates.length; j++) {
        const polygon = block.coordinates[j];
        if (!Array.isArray(polygon) || polygon.length === 0) {
          return { valid: false, error: `Block ${i}, polygon ${j}: invalid polygon structure` };
        }

        for (let k = 0; k < polygon.length; k++) {
          const ring = polygon[k];
          if (!Array.isArray(ring) || ring.length < 3) {
            return {
              valid: false,
              error: `Block ${i}, polygon ${j}, ring ${k}: ring must have at least 3 points`,
            };
          }

          for (let p = 0; p < ring.length; p++) {
            const point = ring[p];
            if (!Array.isArray(point) || point.length < 2) {
              return {
                valid: false,
                error: `Block ${i}, polygon ${j}, ring ${k}, point ${p}: point must have at least [lon, lat]`,
              };
            }
          }
        }
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export function supportsHeights(geometryType: string): boolean {
  return geometryType === 'MultiPolygon';
}
