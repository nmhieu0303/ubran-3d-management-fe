import { useMemo, useCallback } from 'react';
import type Mesh from "@arcgis/core/geometry/Mesh";
import Graphic from "@arcgis/core/Graphic";
import MeshSymbol3D from "@arcgis/core/symbols/MeshSymbol3D";
import FillSymbol3DLayer from "@arcgis/core/symbols/FillSymbol3DLayer";
import type { UrbanObjectLod } from '../types/feature.types';
import {
  convertMultiPolygonToMesh,
  convertPolygonToMesh,
  createBoxMesh,
  shouldUseMeshRendering
} from '../utils/meshUtils';

export interface MeshRenderOptions {
  extrude?: boolean;
  heightScale?: number;
  customColors?: [number, number, number, number][];
  defaultHeight?: number;
  useEdges?: boolean;
  edgeColor?: [number, number, number, number];
}

export const useMeshRenderer = (
  lodData: UrbanObjectLod[],
  options: MeshRenderOptions = {}
) => {
  const {
    extrude = true,
    heightScale = 1.0,
    customColors,
    defaultHeight = 50,
    useEdges = false,
    edgeColor = [35, 47, 32, 1]
  } = options;

  const createMeshSymbol = useCallback((withEdges: boolean = useEdges) => {
    const symbolLayer = new FillSymbol3DLayer({});

    if (withEdges) {
      symbolLayer.edges = {
        type: "solid",
        color: edgeColor as any,
        size: 1
      } as any;
    }

    return new MeshSymbol3D({
      symbolLayers: [symbolLayer]
    });
  }, [useEdges, edgeColor]);

  const convertLodToMesh = useCallback((
    lod: UrbanObjectLod,
    customOptions?: MeshRenderOptions
  ): Mesh | null => {
    const opts = { ...options, ...customOptions };
    const geometryType = lod.geometryType;

    if (geometryType === 'MultiPolygon') {
      return convertMultiPolygonToMesh(lod, {
        extrude: opts.extrude,
        heightScale: opts.heightScale,
        customColors: opts.customColors
      });
    } else if (geometryType === 'Polygon') {
      const color = opts.customColors?.[0] || [100, 100, 100, 1];
      return convertPolygonToMesh(lod, opts.defaultHeight || defaultHeight, color);
    }

    return null;
  }, [options, defaultHeight]);

  const createMeshGraphic = useCallback((
    lod: UrbanObjectLod,
    attributes?: Record<string, any>
  ): __esri.Graphic | null => {
    const mesh = convertLodToMesh(lod);

    if (!mesh) {
      console.warn('Failed to convert LOD to mesh:', lod.id);
      return null;
    }


    return new Graphic({
      geometry: mesh,
      symbol: createMeshSymbol(),
      attributes: {
        id: lod.id,
        urbanObjectId: lod.urbanObjectId,
        lodLevel: lod.lodLevel,
        geometryType: lod.geometryType,
        ...attributes
      }
    });
  }, [convertLodToMesh, createMeshSymbol]);

  const createMeshGraphics = useCallback((
    lods: UrbanObjectLod[],
    filterLodLevel?: number
  ): __esri.Graphic[] => {
    const graphics: __esri.Graphic[] = [];

    lods.forEach(lod => {
      const lodLevel = lod.lodLevel;
      if (filterLodLevel !== undefined && lodLevel !== filterLodLevel) {
        return;
      }

      const geometryType = lod.geometryType;
      if (geometryType === 'MultiPolygon' || geometryType === 'Polygon') {
        const graphic = createMeshGraphic(lod);
        if (graphic) {
          graphics.push(graphic);
        }
      }
    });

    return graphics;
  }, [createMeshGraphic]);

  const shouldRenderAsMesh = useCallback((lod: UrbanObjectLod): boolean => {
    const lodLevel = lod.lodLevel;
    const geometryType = lod.geometryType;
    return (
      shouldUseMeshRendering(lodLevel) &&
      (geometryType === 'MultiPolygon' || geometryType === 'Polygon')
    );
  }, []);

  const createSimpleBoxForLod = useCallback((
    lod: UrbanObjectLod,
    boxSize: number = 50
  ): __esri.Graphic | null => {
    let lon = 0, lat = 0, elevation = 0;
    const geometryType = lod.geometryType;

    if (geometryType === 'Polygon') {
      const coords = (lod.geom.coordinates as number[][][])[0][0];
      lon = coords[0];
      lat = coords[1];
      elevation = coords[2] || 0;
    } else if (geometryType === 'MultiPolygon') {
      const coords = (lod.geom.coordinates as number[][][][])[0][0][0];
      lon = coords[0];
      lat = coords[1];
      elevation = coords[2] || 0;
    } else {
      return null;
    }

    const mesh = createBoxMesh(lon, lat, elevation, {
      width: boxSize,
      depth: boxSize,
      height: boxSize * 2
    });


    return new Graphic({
      geometry: mesh,
      symbol: createMeshSymbol(false),
      attributes: {
        id: lod.id,
        urbanObjectId: lod.urbanObjectId,
        lodLevel: lod.lodLevel
      }
    });
  }, [createMeshSymbol]);

  const getMeshStats = useMemo(() => {
    let meshableCount = 0;
    let multiPolygonCount = 0;
    let polygonCount = 0;

    lodData.forEach(lod => {
      if (shouldRenderAsMesh(lod)) {
        meshableCount++;
        const geometryType = lod.geometryType;
        if (geometryType === 'MultiPolygon') {
          multiPolygonCount++;
        } else if (geometryType === 'Polygon') {
          polygonCount++;
        }
      }
    });

    return {
      total: lodData.length,
      meshable: meshableCount,
      multiPolygon: multiPolygonCount,
      polygon: polygonCount,
      percentage: lodData.length > 0 ? (meshableCount / lodData.length) * 100 : 0
    };
  }, [lodData, shouldRenderAsMesh]);

  return {
    convertLodToMesh,
    createMeshGraphic,
    createMeshGraphics,
    createSimpleBoxForLod,

    shouldRenderAsMesh,
    createMeshSymbol,

    meshStats: getMeshStats
  };
};

export const useShouldUseMesh = (lodLevel: number): boolean => {
  return useMemo(() => shouldUseMeshRendering(lodLevel), [lodLevel]);
};
