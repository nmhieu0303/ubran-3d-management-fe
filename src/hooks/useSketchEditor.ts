import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SceneView from '@arcgis/core/views/SceneView';
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel';
import { useCallback, useEffect, useRef } from 'react';

export interface Transform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

interface UseSketchEditorOptions {
  view: SceneView | null;
  onTransformChange?: (objectId: string, transform: Partial<Transform>) => void;
  enabled?: boolean;
  onHideOriginal?: (objectId: string) => void;
  onShowOriginal?: (objectId: string) => void;
}

export const useSketchEditor = ({
  view,
  onTransformChange,
  enabled = true,
  onHideOriginal,
  onShowOriginal,
}: UseSketchEditorOptions) => {
  const sketchViewModelRef = useRef<SketchViewModel | null>(null);
  const graphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const currentGraphicsRef = useRef<Graphic[]>([]);
  const currentObjectIdRef = useRef<string | null>(null);
  const isEditingRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  const initialCentroidRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const initialBoundsRef = useRef<{ width: number; height: number } | null>(null);
  const accumulatedRotationRef = useRef<number>(0);
  const accumulatedPositionRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const currentMoveBaselineRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const initialGeometryStateRef = useRef<{
    centroid: { x: number; y: number; z: number };
    bounds: { width: number; height: number };
  } | null>(null);

  const onTransformChangeRef = useRef(onTransformChange);
  const onHideOriginalRef = useRef(onHideOriginal);
  const onShowOriginalRef = useRef(onShowOriginal);

  useEffect(() => {
    onTransformChangeRef.current = onTransformChange;
    onHideOriginalRef.current = onHideOriginal;
    onShowOriginalRef.current = onShowOriginal;
  }, [onTransformChange, onHideOriginal, onShowOriginal]);

  useEffect(() => {
    if (!view || !view.map || !enabled) {
      return;
    }


    const graphicsLayer = new GraphicsLayer({
      title: 'Sketch Layer',
      listMode: 'hide',
      elevationInfo: {
        mode: 'relative-to-ground',
        offset: 0,
      },
      minScale: 0,
      maxScale: 0,
    });
    graphicsLayerRef.current = graphicsLayer;
    view.map.add(graphicsLayer);

    const sketchViewModel = new SketchViewModel({
      view: view,
      layer: graphicsLayer,
      updateOnGraphicClick: false,
      defaultUpdateOptions: {
        tool: 'transform',
        enableRotation: true,
        enableScaling: true,
        enableZ: true,
        toggleToolOnClick: false,
        multipleSelectionEnabled: true,
      },
    });
    sketchViewModelRef.current = sketchViewModel;
    isInitializedRef.current = true;

    const handleUpdate = (event: any) => {

      if (
        (event.state === 'active' || event.state === 'complete') &&
        event.graphics &&
        event.graphics.length > 0
      ) {
        const graphics = event.graphics;


        if (
          onTransformChangeRef.current &&
          currentObjectIdRef.current &&
          initialCentroidRef.current &&
          initialBoundsRef.current &&
          initialGeometryStateRef.current
        ) {
          const newCentroid = calculateCentroid(graphics);

          const isMoving =
            event.toolEventInfo?.type === 'move' ||
            event.toolEventInfo?.type === 'move-start' ||
            event.toolEventInfo?.type === 'move-stop';
          const isRotating =
            event.toolEventInfo?.type === 'rotate' ||
            event.toolEventInfo?.type === 'rotate-start' ||
            event.toolEventInfo?.type === 'rotate-stop';
          const isScaling =
            event.toolEventInfo?.type === 'scale' ||
            event.toolEventInfo?.type === 'scale-start' ||
            event.toolEventInfo?.type === 'scale-stop';

          let deltaX = 0;
          let deltaY = 0;
          let deltaZ = 0;

          if (isMoving || (!isRotating && !isScaling && event.state === 'complete')) {
            const absoluteX = newCentroid.x - initialGeometryStateRef.current.centroid.x;
            const absoluteY = newCentroid.y - initialGeometryStateRef.current.centroid.y;
            const absoluteZ = newCentroid.z - initialGeometryStateRef.current.centroid.z;

            deltaX = absoluteX - accumulatedPositionRef.current.x;
            deltaY = absoluteY - accumulatedPositionRef.current.y;
            deltaZ = absoluteZ - accumulatedPositionRef.current.z;


          }

          if (isRotating && event.toolEventInfo?.angle !== undefined) {
            accumulatedRotationRef.current = event.toolEventInfo.angle;
          }
          const rotationZ = accumulatedRotationRef.current;

          let scaleX = 1;
          let scaleY = 1;
          if (
            isScaling &&
            event.toolEventInfo?.xScale !== undefined &&
            event.toolEventInfo?.yScale !== undefined
          ) {
            const rawScaleX = event.toolEventInfo.xScale;
            const rawScaleY = event.toolEventInfo.yScale;

            if (!isFinite(rawScaleX) || !isFinite(rawScaleY) || rawScaleX <= 0 || rawScaleY <= 0) {
              console.warn(
                '⚠️ [useSketchEditor] Invalid scale values from event, keeping default:',
                {
                  rawScaleX,
                  rawScaleY,
                  toolInfo: event.toolEventInfo,
                }
              );
            } else {
              scaleX = rawScaleX;
              scaleY = rawScaleY;

            }
          } else if (isRotating) {
            console.log('[useSketchEditor] Skipping scale calculation (rotating)');
          } else if (isMoving) {
            console.log('[useSketchEditor] Skipping scale calculation (moving)');
          }

          const transformData = {
            position: {
              x: accumulatedPositionRef.current.x + deltaX,
              y: accumulatedPositionRef.current.y + deltaY,
              z: accumulatedPositionRef.current.z + deltaZ,
            },
            rotation: {
              x: 0,
              y: 0,
              z: rotationZ,
            },
            scale: {
              x: scaleX,
              y: scaleY,
              z: 1,
            },
          };

          if (event.state === 'active') {
            console.log('[useSketchEditor] Transform active:');
            console.log(
              JSON.stringify(
                {
                  toolType: event.toolEventInfo?.type,
                  accumulatedPosition: accumulatedPositionRef.current,
                  currentDelta: { x: deltaX, y: deltaY, z: deltaZ },
                  totalPosition: transformData.position,
                  rotation: { z: rotationZ },
                  scale: { x: scaleX, y: scaleY },
                },
                null,
                2
              )
            );
          } else {
            console.log('[useSketchEditor] Transform complete:', {
              toolType: event.toolEventInfo?.type,
              totalPosition: transformData.position,
              rotation: { z: rotationZ },
              scale: { x: scaleX, y: scaleY },
            });
          }

          onTransformChangeRef.current(currentObjectIdRef.current, transformData);

          if (event.toolEventInfo?.type === 'move-stop') {
            accumulatedPositionRef.current = {
              x: transformData.position.x,
              y: transformData.position.y,
              z: transformData.position.z,
            };

            console.log('[useSketchEditor] Accumulated after move-stop:');
            console.log(
              JSON.stringify(
                {
                  deltaThisMove: { x: deltaX, y: deltaY, z: deltaZ },
                  newAccumulatedPosition: accumulatedPositionRef.current,
                },
                null,
                2
              )
            );
          }
        }
      }
    };

    const calculateCentroid = (graphics: Graphic[]) => {
      let sumX = 0,
        sumY = 0,
        sumZ = 0,
        count = 0;

      graphics.forEach((graphic) => {
        const geom = graphic.geometry;

        if (geom && geom.type === 'mesh') {
          const mesh = geom as __esri.Mesh;
          if (mesh.extent) {
            sumX += mesh.extent.center.x;
            sumY += mesh.extent.center.y;
            sumZ += mesh.extent.center.z || 0;
            count++;
          }
          return;
        }

        if (geom && geom.type === 'point') {
          const point = geom as __esri.Point;
          const x = point.longitude ?? point.x ?? 0;
          const y = point.latitude ?? point.y ?? 0;
          const z = point.z ?? 0;
          sumX += x;
          sumY += y;
          sumZ += z;
          count++;
          return;
        }

        if (geom && geom.type === 'polygon') {
          const polygon = geom as Polygon;
          const extent = polygon.extent;
          if (extent) {
            sumX += extent.center.x;
            sumY += extent.center.y;
            sumZ += extent.center.z || 0;
            count++;
          }
        }
      });

      return {
        x: count > 0 ? sumX / count : 0,
        y: count > 0 ? sumY / count : 0,
        z: count > 0 ? sumZ / count : 0,
      };
    };

    const calculateBounds = (graphics: Graphic[]): { width: number; height: number } => {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      graphics.forEach((graphic) => {
        const geom = graphic.geometry;

        if (geom && geom.type === 'mesh') {
          const mesh = geom as __esri.Mesh;
          if (mesh.extent) {
            minX = Math.min(minX, mesh.extent.xmin);
            maxX = Math.max(maxX, mesh.extent.xmax);
            minY = Math.min(minY, mesh.extent.ymin);
            maxY = Math.max(maxY, mesh.extent.ymax);
          }
          return;
        }

        if (geom && geom.type === 'polygon') {
          const polygon = geom as Polygon;
          const extent = polygon.extent;
          if (extent) {
            minX = Math.min(minX, extent.xmin);
            maxX = Math.max(maxX, extent.xmax);
            minY = Math.min(minY, extent.ymin);
            maxY = Math.max(maxY, extent.ymax);
          }
        }
      });

      return {
        width: maxX - minX,
        height: maxY - minY,
      };
    };

    sketchViewModel.on('update', handleUpdate);

    let graphicsWatchHandle: any = null;
    if (graphicsLayer) {
      graphicsWatchHandle = graphicsLayer.watch('graphics.length', (newLength: number) => {
        if (isEditingRef.current && newLength === 0 && currentGraphicsRef.current.length > 0) {
          console.warn('Sketch graphics were cleared during edit - restoring...');
          const clones = currentGraphicsRef.current.map((g) => g.clone());
          graphicsLayer.addMany(clones);
        }
      });
    }

    return () => {
      if (graphicsWatchHandle) {
        graphicsWatchHandle.remove();
      }
      if (sketchViewModel) {
        sketchViewModel.cancel();
        sketchViewModel.destroy();
      }
      if (graphicsLayer && view.map) {
        view.map.remove(graphicsLayer);
      }
      isInitializedRef.current = false;
    };
  }, [view, enabled]);

  const startEditing = useCallback((graphics: Graphic[], objectId: string) => {

    if (!sketchViewModelRef.current || !graphicsLayerRef.current) {
      console.error('SketchViewModel or layer not initialized!');
      return;
    }

    if (!graphics || graphics.length === 0) {
      console.error('No graphics provided for editing');
      return;
    }


    currentObjectIdRef.current = objectId;
    currentGraphicsRef.current = graphics;

    const centroid = calculateCentroidFromGraphics(graphics);
    initialCentroidRef.current = centroid;

    const bounds = calculateBoundsFromGraphics(graphics);
    initialBoundsRef.current = bounds;

    if (!initialGeometryStateRef.current) {
      initialGeometryStateRef.current = { centroid, bounds };
    }

    accumulatedRotationRef.current = 0;
    accumulatedPositionRef.current = { x: 0, y: 0, z: 0 };
    graphicsLayerRef.current.removeAll();

    let editableGraphic: Graphic;

    if (graphics.length > 1) {

      const allRings: number[][][] = [];
      let baseSymbol = graphics[0].symbol?.clone();
      let attributes = graphics[0].attributes;

      let maxHeight = 0;

      graphics.forEach((graphic, index) => {
        if (graphic.geometry && graphic.geometry.type === 'polygon') {
          const polygon = graphic.geometry as Polygon;

          polygon.rings.forEach((ring: any) => {
            const ringWithZ = ring.map((point: any) =>
              point.length === 3 ? point : [...point, 0]
            );
            allRings.push(ringWithZ);
          });

          const extrudeHeight = graphic.attributes?.extrudeHeight;
          if (extrudeHeight && typeof extrudeHeight === 'number') {
            if (extrudeHeight > maxHeight) {
              maxHeight = extrudeHeight;
            }
          }
        }
      });

      const mergedPolygon = new Polygon({
        rings: allRings,
        hasZ: true,
        spatialReference: graphics[0].geometry.spatialReference,
      });

      if (baseSymbol && baseSymbol.type === 'polygon-3d') {
        (baseSymbol as any).symbolLayers.forEach((layer: any) => {
          if (layer.type === 'extrude' && maxHeight > 0) {
            layer.size = maxHeight;
          }
        });
      }

      editableGraphic = new Graphic({
        geometry: mergedPolygon,
        symbol: baseSymbol,
        attributes: { ...attributes, maxHeight },
      });

    } else {
      const clone = graphics[0].clone();

      if (clone.geometry && clone.geometry.type === 'polygon') {
        const polygon: any = clone.geometry;

        if (!polygon.hasZ) {
          polygon.hasZ = true;
        }

        if (polygon.rings) {
          polygon.rings = polygon.rings.map((ring: any) =>
            ring.map((point: any) => {
              return point.length === 2 ? [...point, 0] : point;
            })
          );
        }
      }

      editableGraphic = clone;
    }

    graphicsLayerRef.current.add(editableGraphic);

    if (view && view.map) {
      const layerIndex = view.map.layers.indexOf(graphicsLayerRef.current);
      if (layerIndex !== view.map.layers.length - 1) {
        view.map.reorder(graphicsLayerRef.current, view.map.layers.length - 1);
      }
    }

    if (onHideOriginalRef.current) {
      onHideOriginalRef.current(objectId);
    }

    try {
      sketchViewModelRef.current.update(editableGraphic, {
        tool: 'transform',
        enableRotation: true,
        enableScaling: true,
        enableZ: true,
        toggleToolOnClick: false,
      });

      isEditingRef.current = true;
    } catch (error) {
      console.error('Error starting sketch edit:', error);
      if (onShowOriginalRef.current && currentObjectIdRef.current) {
        onShowOriginalRef.current(currentObjectIdRef.current);
      }
      currentObjectIdRef.current = null;
      currentGraphicsRef.current = [];
      isEditingRef.current = false;
    }
  }, []);

  const stopEditing = useCallback(() => {
    if (!sketchViewModelRef.current || !graphicsLayerRef.current) return;


    if (onShowOriginalRef.current && currentObjectIdRef.current) {
      onShowOriginalRef.current(currentObjectIdRef.current);
    }

    sketchViewModelRef.current.cancel();

    graphicsLayerRef.current.removeAll();

    currentObjectIdRef.current = null;
    currentGraphicsRef.current = [];
    isEditingRef.current = false;
    initialCentroidRef.current = null;
    initialBoundsRef.current = null;
    accumulatedRotationRef.current = 0;
    accumulatedPositionRef.current = { x: 0, y: 0, z: 0 };
    currentMoveBaselineRef.current = null;
    initialGeometryStateRef.current = null;
  }, []);

  const calculateCentroidFromGraphics = (graphics: Graphic[]) => {
    let sumX = 0,
      sumY = 0,
      sumZ = 0,
      count = 0;

    graphics.forEach((graphic) => {
      const geom = graphic.geometry;

      if (geom && geom.type === 'mesh') {
        const mesh = geom as __esri.Mesh;
        if (mesh.extent) {
          const centroid = {
            x: mesh.extent.center.x,
            y: mesh.extent.center.y,
            z: mesh.extent.center.z || 0,
          };
          sumX += centroid.x;
          sumY += centroid.y;
          sumZ += centroid.z;
          count++;
        } else {
          console.warn('⚠️ [useSketchEditor] Mesh has no extent!');
        }
      }

      if (geom && geom.type === 'point') {
        const point = geom as __esri.Point;
        const x = point.longitude || point.x || 0;
        const y = point.latitude || point.y || 0;
        const z = point.z || 0;
        sumX += x;
        sumY += y;
        sumZ += z;
        count++;
      }

      if (geom && geom.type === 'polygon') {
        const polygon = geom as Polygon;
        const extent = polygon.extent;
        if (extent) {
          sumX += extent.center.x;
          sumY += extent.center.y;
          sumZ += extent.center.z || 0;
          count++;
        }
      }
    });

    if (count === 0) {
      console.warn('⚠️ [useSketchEditor] No valid geometries for centroid calculation');
      return { x: 0, y: 0, z: 0 };
    }

    return {
      x: sumX / count,
      y: sumY / count,
      z: sumZ / count,
    };
  };

  const calculateBoundsFromGraphics = (graphics: Graphic[]): { width: number; height: number } => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    graphics.forEach((graphic) => {
      const geom = graphic.geometry;

      if (geom && geom.type === 'mesh') {
        const mesh = geom as __esri.Mesh;
        if (mesh.extent) {
          const extent = mesh.extent;
          minX = Math.min(minX, extent.xmin);
          maxX = Math.max(maxX, extent.xmax);
          minY = Math.min(minY, extent.ymin);
          maxY = Math.max(maxY, extent.ymax);
        } else {
          console.warn('⚠️ [useSketchEditor] Mesh has no extent for bounds!');
        }
      }

      if (geom && geom.type === 'point') {
        const point = geom as __esri.Point;
        const x = point.longitude || point.x || 0;
        const y = point.latitude || point.y || 0;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }

      if (geom && geom.type === 'polygon') {
        const polygon = geom as Polygon;
        const extent = polygon.extent;
        if (extent) {
          minX = Math.min(minX, extent.xmin);
          maxX = Math.max(maxX, extent.xmax);
          minY = Math.min(minY, extent.ymin);
          maxY = Math.max(maxY, extent.ymax);
        }
      }
    });

    const width = maxX - minX;
    const height = maxY - minY;

    if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
      console.warn('⚠️ [useSketchEditor] Invalid bounds calculated:', {
        width,
        height,
        minX,
        maxX,
        minY,
        maxY,
      });
      return { width: 1, height: 1 };
    }

    return { width, height };
  };

  const isEditing = useCallback(() => {
    return isEditingRef.current;
  }, []);

  return {
    startEditing,
    stopEditing,
    isEditing,
  };
};
