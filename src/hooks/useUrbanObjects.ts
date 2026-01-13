import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import LineSymbol3D from '@arcgis/core/symbols/LineSymbol3D';
import PathSymbol3DLayer from '@arcgis/core/symbols/PathSymbol3DLayer';
import type SceneView from '@arcgis/core/views/SceneView';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { urbanObjectApiService } from '../services/urbanObjectApiService';
import type { UrbanObject, UrbanObjectLod } from '../types/feature.types';
import type { UrbanObjectResponse } from '../types/urbanObject.api.types';
import {
  applyTransformToLineString,
  applyTransformToPoint,
  applyTransformToPolygon,
  type Transform,
} from '../utils/geometryUtils';
import { useLodManager } from './useLodManager';

/**
 * Helper function to get symbol for urban object
 */
const getSymbolForObject = (obj: UrbanObject, lod: UrbanObjectLod): any => {
  const height = obj.properties?.height || 10;

  switch (lod.geometryType) {
    case 'Point':
      return {
        type: 'simple-marker',
        color: [0, 122, 255],
        size: '8px',
        outline: {
          color: [0, 0, 0],
          width: 1,
        },
      };

    case 'LineString':
      return new LineSymbol3D({
        symbolLayers: [
          new PathSymbol3DLayer({
            profile: 'circle',
            width: 0.3,
            material: { color: [0, 122, 255] },
          }),
        ],
      });

    case 'Polygon':
    case 'MultiPolygon':
      // Ensure edges are always present for all LOD levels
      return {
        type: 'polygon-3d',
        symbolLayers: [
          {
            type: 'extrude',
            size: height,
            material: { color: [229, 229, 229] },
            edges: {
              type: 'solid',
              color: [0, 0, 0],
              size: 1,
            },
          },
        ],
      };

    default:
      return {
        type: 'simple-fill',
        color: [0, 122, 255],
      };
  }
};

interface UseUrbanObjectsOptions {
  view?: SceneView;
  autoUpdate?: boolean;
  initialAltitude?: number;
  onObjectClick?: (objectId: string, graphic: __esri.Graphic) => void;
  filteredObjectTypes?: string[]; // Filter objects by type - empty array means show all
}

interface UseUrbanObjectsReturn {
  urbanObjects: Array<UrbanObject & { currentLod: UrbanObjectLod }>;
  layer: GraphicsLayer | null;
  currentAltitude: number;
  currentLodLevel: 0 | 1 | 2 | 3;
  isLoading: boolean;
  refresh: () => void;
  highlight: (objectId: string) => void;
  clearHighlight: () => void;
  applyTransform: (objectId: string, transform: Transform) => void;
  getObjectTransform: (objectId: string) => Transform | null;
  getGraphicById: (objectId: string) => Graphic | null;
  getAllGraphicsById: (objectId: string) => Graphic[];
  hideGraphics: (objectId: string) => void;
  showGraphics: (objectId: string) => void;
  removeObject: (objectId: string) => void;
}

/**
 * Custom hook để quản lý Urban Objects và tự động cập nhật LOD theo altitude
 */
export const useUrbanObjects = ({
  view,
  autoUpdate = true,
  initialAltitude = 5000,
  onObjectClick,
  filteredObjectTypes = [],
}: UseUrbanObjectsOptions): UseUrbanObjectsReturn => {
  const [urbanObjects, setUrbanObjects] = useState<
    Array<UrbanObject & { currentLod: UrbanObjectLod }>
  >([]);
  const [layer, setLayer] = useState<GraphicsLayer | null>(null);
  const [currentAltitude, setCurrentAltitude] = useState(initialAltitude);
  const [isLoading, setIsLoading] = useState(false);

  const selectedObjectIdRef = useRef<string | null>(null);
  const watchHandleRef = useRef<__esri.WatchHandle | null>(null);
  const apiResponseCacheRef = useRef<UrbanObjectResponse[] | null>(null); // Cache API response to avoid re-fetching

  const objectTransformsRef = useRef<Map<string, Transform>>(new Map());
  const originalGeometriesRef = useRef<Map<string, any>>(new Map());
  const originalColorsRef = useRef<Map<string, any>>(new Map());

  const {
    currentLod: currentLodLevel,
    getLodForAltitude,
  } = useLodManager(currentAltitude);

  /**
   * Convert API response to internal format with current LOD
   * Falls back to nearest available LOD if exact level not found
   */
  const convertApiResponseToUrbanObject = useCallback(
    (apiObject: UrbanObjectResponse, lodLevel: 0 | 1 | 2 | 3): (UrbanObject & { currentLod: UrbanObjectLod }) | null => {
      if (!apiObject.lods || apiObject.lods.length === 0) {
        console.warn(` No LODs found for object ${apiObject.id}`);
        return null;
      }


      // Find LOD matching current level
      let currentLod = apiObject.lods.find((lod) => lod.lodLevel === lodLevel);

      // Fallback: Find nearest available LOD level
      if (!currentLod) {
        const availableLevels = apiObject.lods.map((lod) => lod.lodLevel).sort();
        const nearestLevel = availableLevels.reduce((prev, curr) =>
          Math.abs(curr - lodLevel) < Math.abs(prev - lodLevel) ? curr : prev
        );
        currentLod = apiObject.lods.find((lod) => lod.lodLevel === nearestLevel);

        if (!currentLod) {
          console.warn(`❌ No valid LOD found for object ${apiObject.id}`);
          return null;
        }
      } else {
      }

      // Validate geometry
      if (!currentLod.geom || !currentLod.geom.coordinates) {
        console.error(`❌ Invalid geometry for object ${apiObject.name}:`, currentLod.geom);
        return null;
      }

      // Use top-level modelAsset if available (promoted from LOD3), otherwise fallback to LOD's modelAsset
      const modelAsset = apiObject.modelAsset ?? currentLod.modelAsset;
      return {
        id: apiObject.id,
        code: apiObject.code,
        name: apiObject.name,
        typeId: apiObject.type || apiObject.typeId || '', // Support type (code) and typeId (UUID)
        type: apiObject.type,
        createdAt: apiObject.createdAt,
        updatedAt: apiObject.updatedAt,
        createdBy: apiObject.createdBy || '',
        properties: apiObject.properties,
        modelTransform: apiObject.modelTransform,
        modelAsset: apiObject.modelAsset,
        currentLod: {
          id: currentLod.id,
          urbanObjectId: apiObject.id,
          lodLevel: currentLod.lodLevel,
          geometryType: (currentLod.geom?.type || currentLod.geometryType) as 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon',
          geom: currentLod.geom,
          heights: currentLod.heights,
          modelAsset: modelAsset
            ? {
                id: modelAsset.id,
                fileUrl: modelAsset.fileUrl,
                fileName: modelAsset.fileName,
                mimeType: modelAsset.mimeType,
                fileSize: modelAsset.fileSize,
                uploadedBy: modelAsset.uploadedBy || '',
                uploadedAt: modelAsset.uploadedAt || modelAsset.updatedAt,
                updatedAt: modelAsset.updatedAt,
              } as any
            : null,
          createdAt: currentLod.createdAt,
          updatedAt: currentLod.updatedAt,
        },
      };
    },
    []
  );

  const loadUrbanObjects = useCallback(
    async (altitude: number, skipCache: boolean = false) => {
      setIsLoading(true);

      try {
        const lodLevel = getLodForAltitude(altitude);

        // Fetch all urban objects from API (no pagination for map view)
        // But reuse cached response if already fetched
        let response: any;

        if (apiResponseCacheRef.current && !skipCache) {
          response = {
            data: apiResponseCacheRef.current,
            total: apiResponseCacheRef.current.length
          };
        } else {
          response = await urbanObjectApiService.getAll({
            noPagination: true, // Use camelCase as per API spec
            status: 'active',
          });

          // Response is already unwrapped by interceptor - check if it has data field
          apiResponseCacheRef.current = response.data || response;
        }

        const objectsData = response.data || response;
        const objects = objectsData
          .map((apiObject: any) => convertApiResponseToUrbanObject(apiObject, lodLevel))
          .filter((obj: any): obj is UrbanObject & { currentLod: UrbanObjectLod } => obj !== null);


        // Always update state when LOD changes - this ensures re-rendering with new LOD data
        setUrbanObjects(objects);
        setCurrentAltitude(altitude);
      } catch (error) {
        console.error('Error loading urban objects from API:', error);
        toast.error('Không thể tải dữ liệu công trình. Vui lòng thử lại!');
      } finally {
        setIsLoading(false);
      }
    },
    [getLodForAltitude, convertApiResponseToUrbanObject]
  );

  // Khởi tạo layer
  useEffect(() => {
    if (!view) {
      return;
    }


    const urbanLayer = new GraphicsLayer({
      id: 'urban-objects-layer',
      title: 'Urban Objects',
      listMode: 'hide',
    });

    // Đợi view.map ready
    const checkMapReady = () => {
      if (view.map) {
        view.map.add(urbanLayer);
        setLayer(urbanLayer);

        if (initialAltitude !== undefined) {
          loadUrbanObjects(initialAltitude);
        }
      } else {
        setTimeout(checkMapReady, 100);
      }
    };

    checkMapReady();

    return () => {
      if (urbanLayer && view.map) {
        view.map.remove(urbanLayer);
        urbanLayer.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (!view || !autoUpdate) return;

    const altitude = view.camera.position.z || initialAltitude;
    loadUrbanObjects(altitude);

    let debounceTimer: ReturnType<typeof setTimeout>;
    let lastLodLevel: 0 | 1 | 2 | 3 | null = null;

    watchHandleRef.current = view.watch('camera.position.z', (altitude: number) => {
      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        const newLodLevel = getLodForAltitude(altitude);

        if (lastLodLevel === null || lastLodLevel !== newLodLevel) {
          lastLodLevel = newLodLevel;
          loadUrbanObjects(altitude);
        }
      }, 200);
    });

    return () => {
      clearTimeout(debounceTimer);
      if (watchHandleRef.current) {
        watchHandleRef.current.remove();
      }
    };
  }, [view, autoUpdate, initialAltitude, getLodForAltitude, loadUrbanObjects]);

  useEffect(() => {
    if (!view || !layer || !onObjectClick) return;

    const handleClick = (event: __esri.ViewClickEvent) => {
      view
        .hitTest(event)
        .then((response) => {
          if (response.results.length > 0) {
            const graphicHit = response.results.find(
              (result) => result.type === 'graphic' && result.graphic.layer === layer
            ) as __esri.GraphicHit | undefined;

            if (graphicHit) {
              const graphic = graphicHit.graphic;
              const objectId = graphic.attributes?.parent_id || graphic.attributes?.id;

              if (objectId) {
                onObjectClick(objectId, graphic);
              }
            }
          }
        })
        .catch((error) => {
          console.error('Hit test error:', error);
        });
    };

    view.on('click', handleClick);

    return () => {
    };
  }, [view, layer, onObjectClick]);

  useEffect(() => {
    if (!layer) {
      return;
    }

    if (urbanObjects.length === 0) {
      layer.removeAll();
      return;
    }

    // Filter objects based on filteredObjectTypes
    // If filteredObjectTypes is empty, show all objects
    const objectsToRender = filteredObjectTypes.length === 0
      ? urbanObjects
      : urbanObjects.filter((obj) => filteredObjectTypes.includes(obj.typeId || obj.type || ''));

    layer.removeAll();

    const graphics = objectsToRender
      .flatMap((obj) => {
        const lod = obj.currentLod;
        const actualGeometryType = lod.geometryType || lod.geom?.type; // Use actual geometry type
        // Check if this LOD has a 3D model asset available (any LOD level can have a model)
        const hasModel = !!(lod.modelAsset && lod.modelAsset.fileUrl);


        // ===== CASE 1: LOD3 with 3D Model (Point or Polygon only) =====
        // Only LOD3 with Point or Polygon geometry should render 3D models
        const canRender3DModel = lod.lodLevel === 3 && hasModel && (actualGeometryType === 'Point' || actualGeometryType === 'Polygon');
        if (canRender3DModel) {
          let centerLon: number, centerLat: number, baseZ: number;

          // Get center point based on geometry type
          if (actualGeometryType === 'Point') {
            centerLon = lod.geom.coordinates[0];
            centerLat = lod.geom.coordinates[1];
            baseZ = lod.geom.coordinates[2] || 0;
          } else if (actualGeometryType === 'MultiPolygon') {
            // Tính center point của tất cả polygons
            const allPoints: number[][] = [];
            lod.geom.coordinates.forEach((polygonCoords: any) => {
              polygonCoords[0]?.forEach((point: any) => {
                allPoints.push([point[0], point[1], point[2] || 0]);
              });
            });

            if (allPoints.length === 0) return null;
            centerLon = allPoints.reduce((sum, p) => sum + p[0], 0) / allPoints.length;
            centerLat = allPoints.reduce((sum, p) => sum + p[1], 0) / allPoints.length;
            baseZ = 0;
          } else if (actualGeometryType === 'Polygon') {
            const ring = lod.geom.coordinates[0] || [];
            if (ring.length === 0) return null;
            centerLon = ring.reduce((sum: number, p: any) => sum + p[0], 0) / ring.length;
            centerLat = ring.reduce((sum: number, p: any) => sum + p[1], 0) / ring.length;
            baseZ = ring[0]?.[2] || 0;
          } else {
            return null;
          }

          const modelUrl = lod.modelAsset?.fileUrl;
          if (!modelUrl) {
            console.warn(`No modelAsset.fileUrl found for object ${obj.id} LOD ${lod.lodLevel}`, {
              modelAsset: lod.modelAsset,
              lodKeys: Object.keys(lod),
            });
            return null;
          }

          const fullModelUrl = modelUrl.startsWith('http') ? modelUrl : `${window.location.origin}${modelUrl}`;

          // Parse modelTransform (handle both tuple [x,y,z] and object {x,y,z} formats)
          const transform = (obj.modelTransform || {}) as any;

          // Position
          const position = Array.isArray(transform.position)
            ? { x: transform.position[0], y: transform.position[1], z: transform.position[2] }
            : transform.position || { x: 0, y: 0, z: 0 };

          // Rotation
          const rotation = Array.isArray(transform.rotation)
            ? { x: transform.rotation[0], y: transform.rotation[1], z: transform.rotation[2] }
            : transform.rotation || { x: 0, y: 0, z: 0 };

          // Scale
          const scale = Array.isArray(transform.scale)
            ? { x: transform.scale[0], y: transform.scale[1], z: transform.scale[2] }
            : transform.scale || { x: 1, y: 1, z: 1 };

          return [
            new Graphic({
              geometry: {
                type: 'point',
                longitude: centerLon + (position.x || 0),
                latitude: centerLat + (position.y || 0),
                z: baseZ + (position.z || 0),
              },
              attributes: {
                id: obj.id,
                name: obj.name,
                code: obj.code,
                typeId: obj.typeId,
                ...obj.properties,
              },
              symbol: {
                type: 'point-3d',
                symbolLayers: [
                  {
                    type: 'object',
                    resource: { href: fullModelUrl },
                    // Apply rotation from modelTransform
                    heading: rotation.z || 0,
                    pitch: rotation.x || 0,
                    roll: rotation.y || 0,
                    height: (obj.properties?.height || 100) * 2.5, // Scale up 2.5x
                    width: (obj.properties?.width || 100) * (scale.x || 1),
                    depth: (obj.properties?.depth || 100) * (scale.y || 1),
                  } as any,
                ],
              } as any,
            }),
          ];
        }

        // ===== CASE 2: MultiPolygon (all LODs - render as geometry) =====
        // MultiPolygon always renders as geometry (never as 3D model)
        if (actualGeometryType === 'MultiPolygon') {

          // Render each polygon part as separate extrude block
          // Each polygon is a tier at different Z elevation with its own height
          return lod.geom.coordinates.map((polygonCoords: any, index: number) => {
            const firstPoint = polygonCoords[0]?.[0] || [];
            const baseZ = firstPoint[2] !== undefined ? firstPoint[2] : 0;

            // Get height from heights array, or use object height as fallback
            const extrudeHeight = lod.heights?.[index] ?? obj.properties?.height ?? 20;

            const ringsWithZ = polygonCoords.map((ring: any) =>
              ring.map((point: any) => (point.length === 2 ? [...point, baseZ] : point))
            );

            return new Graphic({
              geometry: {
                type: 'polygon',
                rings: ringsWithZ,
                hasZ: true,
              },
              attributes: {
                id: `${obj.id}_tier${index}`,
                parent_id: obj.id,
                name: obj.name,
                code: obj.code,
                typeId: obj.typeId,
                tier: index,
                baseElevation: baseZ,
                extrudeHeight: extrudeHeight,
                ...obj.properties,
              },
              symbol: {
                type: 'polygon-3d',
                symbolLayers: [
                  {
                    type: 'extrude',
                    size: extrudeHeight,
                    material: { color: [229, 229, 229, 0.85] },
                    edges: {
                      type: 'solid',
                      color: [100, 100, 100, 0.9],
                      size: 1,
                    } as any,
                  },
                ],
              },
            });
          });
        }

        // ===== CASE 3: Point/LineString/Polygon geometry (fallback for all LODs without 3D model) =====
        // This handles:
        // - LOD0, LOD1, LOD2: always render as geometry
        // - LOD3 without model: render as geometry
        // - LOD3 with model but wrong geometry type (MultiPolygon, etc): render as geometry
        else {
          let arcgisGeometry: any;
          let symbol: any;

          if (actualGeometryType === 'Point') {
            arcgisGeometry = {
              type: 'point',
              longitude: lod.geom.coordinates[0],
              latitude: lod.geom.coordinates[1],
            };
            symbol = {
              type: 'simple-marker',
              color: [100, 150, 255],
              size: 8,
              outline: { color: [0, 0, 0], width: 1 },
            };
          } else if (actualGeometryType === 'LineString') {
            arcgisGeometry = {
              type: 'polyline',
              paths: [lod.geom.coordinates],
            };
            symbol = {
              type: 'simple-line',
              color: [0, 100, 200],
              width: 2,
            };
          } else if (actualGeometryType === 'Polygon') {
            const ringsWithZ = lod.geom.coordinates.map((ring: any) =>
              ring.map((point: any) => (point.length === 2 ? [...point, 0] : point))
            );
            arcgisGeometry = {
              type: 'polygon',
              rings: ringsWithZ,
              hasZ: true,
            };
            symbol = {
              type: 'simple-fill',
              color: [100, 180, 255, 0.5],
              outline: {
                color: [0, 0, 0, 0.8],
                width: 1,
              },
            };
          } else {
            return null;
          }

          return new Graphic({
            geometry: arcgisGeometry,
            attributes: {
              id: obj.id,
              name: obj.name,
              code: obj.code,
              typeId: obj.typeId,
              ...obj.properties,
            },
            symbol: symbol,
          });
        }
      })
      .filter((g) => g !== null);

    layer.addMany(graphics);
    // Re-apply highlight if there's a selected object
    if (selectedObjectIdRef.current) {
      // Use setTimeout to ensure graphics are fully added before highlighting
      setTimeout(() => {
        if (selectedObjectIdRef.current) {
          applyHighlightInternal(layer, selectedObjectIdRef.current);
        }
      }, 0);
    }
  }, [layer, urbanObjects, filteredObjectTypes]);

  // Refresh manually
  const refresh = useCallback(() => {
    if (view) {
      const altitude = view.camera.position.z;
      if (altitude !== undefined) {
        // Clear cache to fetch fresh data
        apiResponseCacheRef.current = null;
        loadUrbanObjects(altitude, true);
      }
    }
  }, [view, loadUrbanObjects]);

  const saveOriginalSymbolColor = useCallback((graphicId: string, symbol: any) => {
    if (!symbol) return;

    const colorInfo: any = {
      type: symbol.type,
    };

    if (symbol.type === 'polygon-3d') {
      const polygonSymbol = symbol as __esri.PolygonSymbol3D;
      if (polygonSymbol.symbolLayers && polygonSymbol.symbolLayers.length > 0) {
        const extrudeLayer = polygonSymbol.symbolLayers.getItemAt(0) as any;
        if (extrudeLayer.material) {
          colorInfo.fillColor = extrudeLayer.material.color?.slice?.() || [229, 229, 229];
        }
        if (extrudeLayer.edges) {
          colorInfo.edgeColor = extrudeLayer.edges.color?.slice?.() || [0, 0, 0];
          colorInfo.edgeSize = extrudeLayer.edges.size || 1;
        }
      }
    } else if (symbol.type === 'mesh-3d') {
      const meshSymbol = symbol as __esri.MeshSymbol3D;
      if (meshSymbol.symbolLayers && meshSymbol.symbolLayers.length > 0) {
        const fillLayer = meshSymbol.symbolLayers.getItemAt(0) as any;
        if (fillLayer.material) {
          colorInfo.fillColor = fillLayer.material.color?.slice?.() || [229, 229, 229];
        }
        if (fillLayer.edges) {
          colorInfo.edgeColor = fillLayer.edges.color?.slice?.() || [0, 0, 0];
          colorInfo.edgeSize = fillLayer.edges.size || 1;
        }
      }
    } else if (symbol.type === 'point-3d') {
      const pointSymbol = symbol as __esri.PointSymbol3D;
      if (pointSymbol.symbolLayers && pointSymbol.symbolLayers.length > 0) {
        const objectLayer = pointSymbol.symbolLayers.getItemAt(0) as any;
        if (objectLayer && objectLayer.material) {
          colorInfo.materialColor = objectLayer.material.color?.slice?.() || [255, 255, 255, 1];
          colorInfo.castShadows = objectLayer.castShadows || false;
        }
      }
    } else if ('color' in symbol) {
      colorInfo.color = (symbol as any).color?.slice?.() || [0, 122, 255];
    }

    originalColorsRef.current.set(graphicId, colorInfo);
  }, []);

  const applyHighlightInternal = (targetLayer: GraphicsLayer, objectId: string) => {
    let highlightedCount = 0;
    let checkedCount = 0;

    targetLayer.graphics.forEach((graphic) => {
      checkedCount++;

      if (!graphic.symbol) {
        return;
      }

      const graphicId = graphic.attributes?.parent_id || graphic.attributes?.id;
      const isSelected = graphicId === objectId;

      if (isSelected) {
        highlightedCount++;
      }

      const graphicUid = (graphic as any).uid || graphic.attributes?.id;
      if (!originalColorsRef.current.has(graphicUid)) {
        saveOriginalSymbolColor(graphicUid, graphic.symbol);
      }

      // Clone symbol để tránh modify shared symbol
      const symbol = graphic.symbol.clone();

      if (symbol.type === 'polygon-3d') {
        const polygonSymbol = symbol as __esri.PolygonSymbol3D;
        if (polygonSymbol.symbolLayers && polygonSymbol.symbolLayers.length > 0) {
          const extrudeLayer = polygonSymbol.symbolLayers.getItemAt(0) as any;
          if (extrudeLayer.material) {
            extrudeLayer.material.color = isSelected ? [255, 255, 0] : [229, 229, 229];
          }
          if (extrudeLayer.edges) {
            extrudeLayer.edges.color = isSelected ? [255, 200, 0] : [0, 0, 0];
            extrudeLayer.edges.size = isSelected ? 2 : 1;
          }
        }
      } else if (symbol.type === 'mesh-3d') {
        const meshSymbol = symbol as __esri.MeshSymbol3D;
        if (meshSymbol.symbolLayers && meshSymbol.symbolLayers.length > 0) {
          const fillLayer = meshSymbol.symbolLayers.getItemAt(0) as any;
          // Keep original model color - don't change material color for models
          // Only change edges for highlight effect
          if (fillLayer.edges) {
            fillLayer.edges.color = isSelected ? [255, 200, 0] : [0, 0, 0];
            fillLayer.edges.size = isSelected ? 2 : 1;
          }
        }
      } else if (symbol.type === 'point-3d') {
        const pointSymbol = symbol as __esri.PointSymbol3D;
        if (pointSymbol.symbolLayers && pointSymbol.symbolLayers.length > 0) {
          const objectLayer = pointSymbol.symbolLayers.getItemAt(0) as any;
          if (objectLayer && objectLayer.type === 'object') {
            objectLayer.material = isSelected
              ? {
                  color: [255, 255, 0],
                }
              : null;

            objectLayer.castShadows = isSelected;
          }
        }
      } else if ('color' in symbol) {
        (symbol as any).color = isSelected ? [255, 255, 0] : [0, 122, 255];
      }

      graphic.symbol = symbol;
    });
  };

  // Highlight object - now stores selection state
  const highlight = useCallback(
    (objectId: string) => {
      selectedObjectIdRef.current = objectId;
      if (layer) {
        applyHighlightInternal(layer, objectId);
      } else {
        console.error('Cannot apply highlight - layer is null!');
      }
    },
    [layer]
  );

  const clearHighlight = useCallback(() => {
    selectedObjectIdRef.current = null;

    if (!layer) return;

    layer.graphics.forEach((graphic) => {
      if (!graphic.symbol) return;

      const graphicUid = (graphic as any).uid || graphic.attributes?.id;
      const originalColor = originalColorsRef.current.get(graphicUid) || {
        type: graphic.symbol.type,
      };

      const symbol = graphic.symbol.clone();

      if (symbol.type === 'polygon-3d') {
        const polygonSymbol = symbol as __esri.PolygonSymbol3D;
        if (polygonSymbol.symbolLayers && polygonSymbol.symbolLayers.length > 0) {
          const extrudeLayer = polygonSymbol.symbolLayers.getItemAt(0) as any;
          if (extrudeLayer.material) {
            extrudeLayer.material.color = originalColor.fillColor || [229, 229, 229];
          }
          if (extrudeLayer.edges) {
            extrudeLayer.edges.color = originalColor.edgeColor || [0, 0, 0];
            extrudeLayer.edges.size = originalColor.edgeSize || 1;
          }
        }
      } else if (symbol.type === 'mesh-3d') {
        const meshSymbol = symbol as __esri.MeshSymbol3D;
        if (meshSymbol.symbolLayers && meshSymbol.symbolLayers.length > 0) {
          const fillLayer = meshSymbol.symbolLayers.getItemAt(0) as any;
          if (fillLayer.material) {
            fillLayer.material.color = originalColor.fillColor || [229, 229, 229];
          }
          if (fillLayer.edges) {
            fillLayer.edges.color = originalColor.edgeColor || [0, 0, 0];
            fillLayer.edges.size = originalColor.edgeSize || 1;
          }
        }
      } else if (symbol.type === 'point-3d') {
        const pointSymbol = symbol as __esri.PointSymbol3D;
        if (pointSymbol.symbolLayers && pointSymbol.symbolLayers.length > 0) {
          const objectLayer = pointSymbol.symbolLayers.getItemAt(0) as any;
          if (objectLayer && objectLayer.type === 'object') {
            // Restore to original material or null (no tint)
            objectLayer.material = originalColor.materialColor
              ? { color: originalColor.materialColor }
              : null;
            objectLayer.castShadows = originalColor.castShadows || false;
          }
        }
      } else if ('color' in symbol) {
        (symbol as any).color = originalColor.color || [0, 122, 255];
      }

      graphic.symbol = symbol;
    });
  }, [layer]);

  /**
   * Apply transform to an object's graphics on the map
   */
  const applyTransform = useCallback(
    (objectId: string, transform: Transform) => {
      if (!layer) {
        console.warn('Cannot apply transform - layer is null');
        return;
      }

      // Store the transform
      objectTransformsRef.current.set(objectId, transform);

      // Find all graphics for this object
      // Graphics may have parent_id (for multi-tier) or be the object directly (single graphics)
      const objectGraphics = layer.graphics.filter((graphic) => {
        const parentId = graphic.attributes?.parent_id;
        const graphicId = graphic.attributes?.id;

        // Match if parent_id matches objectId (multi-tier graphics)
        if (parentId && parentId === objectId) return true;

        // Match if id matches objectId (single graphics)
        if (graphicId && graphicId === objectId) return true;

        return false;
      });

      if (objectGraphics.length === 0) {
        console.warn(`No graphics found for object ${objectId}`);
        return;
      }

      // Apply transform to each graphic
      objectGraphics.forEach((graphic) => {
        const geometry = graphic.geometry;
        if (!geometry) return;

        // Store original geometry if not already stored
        // Use graphic's unique ID as key
        const graphicKey = graphic.attributes?.id || `${objectId}_${graphic.geometry?.type}`;
        if (!originalGeometriesRef.current.has(graphicKey)) {
          originalGeometriesRef.current.set(graphicKey, geometry.clone());
        }

        const originalGeometry = originalGeometriesRef.current.get(graphicKey);
        if (!originalGeometry) return;

        let transformedGeometry: any = null;

        if (geometry.type === 'polygon') {
          const polygonGeom = originalGeometry as __esri.Polygon;
          const rings = polygonGeom.rings;
          const transformedRings = applyTransformToPolygon(rings, transform);

          transformedGeometry = {
            type: 'polygon',
            rings: transformedRings,
            spatialReference: polygonGeom.spatialReference,
            hasZ: true,
          };

          graphic.geometry = transformedGeometry;

          if (graphic.symbol && graphic.symbol.type === 'polygon-3d') {
            const symbol = graphic.symbol.clone() as __esri.PolygonSymbol3D;
            if (symbol.symbolLayers && symbol.symbolLayers.length > 0) {
              const extrudeLayer = symbol.symbolLayers.getItemAt(0) as any;
              const originalHeight = graphic.attributes?.extrudeHeight || 10;
              extrudeLayer.size = originalHeight * (transform.scale.z || 1);
            }
            graphic.symbol = symbol;
          }
        } else if (geometry.type === 'point') {
          const pointGeom = originalGeometry as __esri.Point;
          const coords: [number, number] = [pointGeom.longitude || 0, pointGeom.latitude || 0];
          // Pass coords as center so rotation/scale happens around the point itself
          const transformedCoords = applyTransformToPoint(coords, transform, coords);

          transformedGeometry = {
            type: 'point',
            longitude: transformedCoords[0],
            latitude: transformedCoords[1],
            spatialReference: pointGeom.spatialReference,
          };

          graphic.geometry = transformedGeometry;
        } else if (geometry.type === 'polyline') {
          const lineGeom = originalGeometry as __esri.Polyline;
          const paths = lineGeom.paths;
          const transformedPaths = paths.map((path) => applyTransformToLineString(path, transform));

          transformedGeometry = {
            type: 'polyline',
            paths: transformedPaths,
            spatialReference: lineGeom.spatialReference,
          };

          graphic.geometry = transformedGeometry;
        }
      });

      // Re-apply highlight if this object is selected
      if (selectedObjectIdRef.current === objectId) {
        setTimeout(() => {
          applyHighlightInternal(layer, objectId);
        }, 0);
      }
    },
    [layer]
  );

  /**
   * Get current transform for an object
   */
  const getObjectTransform = useCallback((objectId: string): Transform | null => {
    return objectTransformsRef.current.get(objectId) || null;
  }, []);

  /**
   * Get graphic by object ID
   */
  const getGraphicById = useCallback(
    (objectId: string): Graphic | null => {
      if (!layer) return null;

      const graphics = layer.graphics.toArray();
      const graphic = graphics.find((g) => {
        const id = g.attributes?.parent_id || g.attributes?.id;
        return id === objectId;
      });

      return graphic || null;
    },
    [layer]
  );

  /**
   * Get ALL graphics for an object (including parts for MultiPolygon/LOD3)
   */
  const getAllGraphicsById = useCallback(
    (objectId: string): Graphic[] => {
      if (!layer) return [];

      const graphics = layer.graphics.toArray();
      const objectGraphics = graphics.filter((g) => {
        const id = g.attributes?.parent_id || g.attributes?.id;
        return id === objectId;
      });

      return objectGraphics;
    },
    [layer]
  );

  /**
   * Hide graphics for an object (used during editing)
   */
  const hideGraphics = useCallback(
    (objectId: string) => {
      if (!layer) return;

      const graphics = layer.graphics.toArray();
      graphics.forEach((g) => {
        const id = g.attributes?.parent_id || g.attributes?.id;
        if (id === objectId) {
          g.visible = false;
        }
      });
    },
    [layer]
  );

  /**
   * Show graphics for an object (used after editing)
   */
  const showGraphics = useCallback(
    (objectId: string) => {
      if (!layer) return;

      const graphics = layer.graphics.toArray();
      graphics.forEach((g) => {
        const id = g.attributes?.parent_id || g.attributes?.id;
        if (id === objectId) {
          g.visible = true;
        }
      });
    },
    [layer]
  );

  /**
   * Remove an object from the map and state
   */
  const removeObject = useCallback(
    (objectId: string) => {
      // Remove from state
      setUrbanObjects((prev) => prev.filter((obj) => obj.id !== objectId));

      // Remove graphics from layer
      if (layer) {
        const graphics = layer.graphics.toArray();
        graphics.forEach((g) => {
          const id = g.attributes?.parent_id || g.attributes?.id;
          if (id === objectId) {
            layer.remove(g);
          }
        });
      }

      // Clear any stored transforms for this object
      objectTransformsRef.current.delete(objectId);
      originalGeometriesRef.current.delete(objectId);
      originalColorsRef.current.delete(objectId);
    },
    [layer]
  );

  return {
    urbanObjects,
    layer,
    currentAltitude,
    currentLodLevel,
    isLoading,
    refresh,
    highlight,
    clearHighlight,
    applyTransform,
    getObjectTransform,
    getGraphicById,
    getAllGraphicsById,
    hideGraphics,
    showGraphics,
    removeObject,
  };
};
