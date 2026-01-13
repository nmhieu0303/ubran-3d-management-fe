
import Mesh from '@arcgis/core/geometry/Mesh';
import MeshComponent from '@arcgis/core/geometry/support/MeshComponent';
import MeshGeoreferencedVertexSpace from '@arcgis/core/geometry/support/MeshGeoreferencedVertexSpace';
import MeshMaterial from '@arcgis/core/geometry/support/MeshMaterial';
import type { UrbanObjectLod } from '../types/feature.types';

const getBaseElevation = (ring: number[][]): number => {
  return ring[0]?.[2] || 0;
};

const polygonToMeshData = (ring: number[][], origin: number[]) => {
  const position: number[] = [];
  const uv: number[] = [];

  const uniquePoints = ring.slice(0, -1);
  const n = uniquePoints.length;

  if (n < 3) {
    console.warn('Ring has less than 3 unique points for 2D mesh');
    return { position, uv, faces: [] };
  }

  uniquePoints.forEach((coord, index) => {
    position.push(
      coord[0] - origin[0],
      coord[1] - origin[1],
      (coord[2] || 0) - origin[2]
    );

    uv.push(
      index / n,
      (coord[2] || 0) / 1000
    );
  });

  const faces: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    faces.push(0, i, i + 1);
  }

  return { position, uv, faces };
};

const earcut = (vertices: number[][]): number[] => {
  const n = vertices.length;
  if (n < 3) return [];

  const indices: number[] = [];

  if (n === 3) {
    return [0, 1, 2];
  }

  let isConvex = true;
  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];

    const cross =
      (next[0] - curr[0]) * (prev[1] - curr[1]) - (next[1] - curr[1]) * (prev[0] - curr[0]);

    if (cross < 0) {
      isConvex = false;
      break;
    }
  }

  if (isConvex) {
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i, i + 1);
    }
    return indices;
  }

  const available = Array.from({ length: n }, (_, i) => i);

  while (available.length > 3) {
    let earFound = false;

    for (let i = 0; i < available.length; i++) {
      const prevIdx = available[(i - 1 + available.length) % available.length];
      const currIdx = available[i];
      const nextIdx = available[(i + 1) % available.length];

      const prev = vertices[prevIdx];
      const curr = vertices[currIdx];
      const next = vertices[nextIdx];

      const cross =
        (next[0] - curr[0]) * (prev[1] - curr[1]) - (next[1] - curr[1]) * (prev[0] - curr[0]);

      if (cross >= 0) {
        let hasPointInside = false;

        for (let j = 0; j < available.length; j++) {
          if (
            j === i ||
            j === (i - 1 + available.length) % available.length ||
            j === (i + 1) % available.length
          )
            continue;

          const testIdx = available[j];
          const testPoint = vertices[testIdx];

          if (isPointInTriangle(testPoint, prev, curr, next)) {
            hasPointInside = true;
            break;
          }
        }

        if (!hasPointInside) {

          indices.push(prevIdx, currIdx, nextIdx);
          available.splice(i, 1);
          earFound = true;
          break;
        }
      }
    }

    if (!earFound) {
      console.warn('Ear clipping failed, using fallback triangulation');
      for (let i = 1; i < available.length - 1; i++) {
        indices.push(available[0], available[i], available[i + 1]);
      }
      break;
    }
  }

  if (available.length === 3) {
    indices.push(available[0], available[1], available[2]);
  }

  return indices;
};


const isPointInTriangle = (point: number[], v1: number[], v2: number[], v3: number[]): boolean => {
  const sign = (p1: number[], p2: number[], p3: number[]) => {
    return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  };

  const d1 = sign(point, v1, v2);
  const d2 = sign(point, v2, v3);
  const d3 = sign(point, v3, v1);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
};

const createExtrudedMeshData = (
  ring: number[][],
  height: number
): { position: number[]; uv: number[]; faces: number[] } => {
  const position: number[] = [];
  const uv: number[] = [];
  const faces: number[] = [];

  const baseZ = ring[0]?.[2] || 0;
  const topZ = baseZ + height;

  const uniquePoints = ring.slice(0, -1);
  const n = uniquePoints.length;

  if (n < 3) {
    console.warn('Ring has less than 3 unique points, cannot create mesh');
    return { position, uv, faces };
  }

  uniquePoints.forEach((coord, index) => {
    position.push(
      coord[0],
      coord[1],
      baseZ
    );
    uv.push(index / n, 0);
  });

  uniquePoints.forEach((coord, index) => {
    position.push(
      coord[0],
      coord[1],
      topZ
    );
    uv.push(index / n, 1);
  });


  const bottomIndices = earcut(uniquePoints);
  faces.push(...bottomIndices);


  const topIndices = earcut(uniquePoints).map((idx) => idx + n);

  for (let i = 0; i < topIndices.length; i += 3) {
    faces.push(topIndices[i], topIndices[i + 2], topIndices[i + 1]);
  }

  for (let i = 0; i < n; i++) {
    const nextI = (i + 1) % n;

    const bottom1 = i;
    const bottom2 = nextI;
    const top1 = n + i;
    const top2 = n + nextI;


    faces.push(bottom1, bottom2, top1);

    faces.push(top1, bottom2, top2);
  }

  return { position, uv, faces };
};

export const convertMultiPolygonToMesh = (
  lodData: UrbanObjectLod,
  options: {
    extrude?: boolean;
    heightScale?: number;
    customColors?: [number, number, number, number][];
  } = {}
): Mesh | null => {
  if (lodData.geometryType !== 'MultiPolygon') {
    return null;
  }

  const { extrude = true, heightScale = 1.0, customColors } = options;
  const multiPolygon = lodData.geom.coordinates as number[][][][];
  const heights = lodData.heights;

  if (!multiPolygon || multiPolygon.length === 0) {
    return null;
  }


  const firstRing = multiPolygon[0][0];
  const origin = [firstRing[0][0], firstRing[0][1], firstRing[0][2] || 0];

  const components: MeshComponent[] = [];
  const allPositions: number[] = [];
  const allUVs: number[] = [];
  let vertexOffset = 0;

  multiPolygon.forEach((polygonCoords, index) => {
    const ring = polygonCoords[0];

    if (!ring || ring.length < 3) return;

    const material = new MeshMaterial({
      color:
        customColors && customColors[index]
          ? (customColors[index] as any)
          : ([229, 229, 229, 1] as any),
    });

    if (extrude) {
      let height = 0;


      if (heights && Array.isArray(heights) && heights[index] !== undefined) {
        height = heights[index] * heightScale;
      }

      else {
        const baseZ = getBaseElevation(ring);


        if (index < multiPolygon.length - 1) {
          const nextRing = multiPolygon[index + 1][0];
          const nextZ = getBaseElevation(nextRing);
          height = (nextZ - baseZ) * heightScale;
        } else {

          height = 50 * heightScale;
        }
      }

      if (height > 0) {
        const meshData = createExtrudedMeshData(ring, height);


        const adjustedFaces = meshData.faces.map((idx) => idx + vertexOffset);


        allPositions.push(...meshData.position);
        allUVs.push(...meshData.uv);

        const component = new MeshComponent({
          faces: adjustedFaces,
          material,
        });
        components.push(component);

        vertexOffset += meshData.position.length / 3;
      }
    } else {

      const { position, uv, faces } = polygonToMeshData(ring, [0, 0, 0]);


      const adjustedFaces = faces.map((idx) => idx + vertexOffset);

      allPositions.push(...position);
      allUVs.push(...uv);

      const component = new MeshComponent({
        faces: adjustedFaces,
        material,
      });
      components.push(component);

      vertexOffset += position.length / 3;
    }
  });

  try {
    const mesh = new Mesh({
      vertexSpace: new MeshGeoreferencedVertexSpace({
        spatialReference: { wkid: 4326 },
      }),
      components,
      vertexAttributes: {
        position: allPositions,
        uv: allUVs,
      },
      spatialReference: { wkid: 4326 },
    });

    return mesh;
  } catch (error) {
    console.error('❌ Error creating mesh:', error);
    return null;
  }
};

export const convertPolygonToMesh = (
  lodData: UrbanObjectLod,
  height: number = 50,
  color: [number, number, number, number] = [100, 100, 100, 1]
): Mesh | null => {
  if (lodData.geometryType !== 'Polygon') {
    return null;
  }

  const polygon = lodData.geom.coordinates as number[][][];

  if (!polygon || polygon.length === 0) {
    return null;
  }

  const ring = polygon[0];
  const origin = [ring[0][0], ring[0][1], ring[0][2] || 0];

  const meshData = createExtrudedMeshData(ring, height);

  const material = new MeshMaterial({
    color: color as any,
    colorMixMode: 'replace',
  });

  const component = new MeshComponent({
    faces: meshData.faces,
    material,
  });

  try {
    const mesh = new Mesh({
      vertexSpace: new MeshGeoreferencedVertexSpace({
        spatialReference: { wkid: 4326 },
      }),
      components: [component],
      vertexAttributes: {
        position: meshData.position,
        uv: meshData.uv,
      },
      spatialReference: { wkid: 4326 },
    });


    return mesh;
  } catch (error) {
    console.error('Error creating polygon mesh:', error);
    return null;
  }
};


export const createBoxMesh = (
  longitude: number,
  latitude: number,
  elevation: number,
  size: { width: number; depth: number; height: number },
  color: [number, number, number, number] = [100, 100, 100, 1]
): Mesh => {
  const point = {
    x: longitude,
    y: latitude,
    z: elevation,
    spatialReference: { wkid: 4326 },
  };

  const material = new MeshMaterial({
    color: color as any,
  });

  return Mesh.createBox(point as any, {
    size,
    material,
  });
};

export const getLodLevelForAltitude = (altitude: number): 0 | 1 | 2 | 3 => {
  if (altitude >= 3000) return 0;
  if (altitude >= 2000) return 1;
  if (altitude >= 1000) return 2;
  return 3;
};

export const shouldUseMeshRendering = (lodLevel: number): boolean => {
  return lodLevel >= 2;
};
