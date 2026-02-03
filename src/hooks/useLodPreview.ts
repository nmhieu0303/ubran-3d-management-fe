

import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import Polygon from '@arcgis/core/geometry/Polygon';
import { LineSymbol3D, LineSymbol3DLayer, PointSymbol3D, IconSymbol3DLayer, PolygonSymbol3D, ExtrudeSymbol3DLayer, FillSymbol3DLayer, ObjectSymbol3DLayer, PathSymbol3DLayer, MeshSymbol3D } from '@arcgis/core/symbols';
import type SceneView from '@arcgis/core/views/SceneView';
import Sketch from '@arcgis/core/widgets/Sketch';
import { useEffect, useRef, useState } from 'react';
import { ALTITUDE_THRESHOLDS } from '../constants';
import { convertMultiPolygonToMesh } from '../utils/meshUtils';
import type { UrbanObjectLod } from '../types/feature.types';

export interface PreviewGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
  coordinates: any;
  height?: number;
  heights?: number[];
  modelFile?: File;
  anchorPoint?: Point;
}

export interface UseLodPreviewOptions {
  view: SceneView | null | undefined;
  onTransform?: (transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }) => void;
  currentTransform?: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  };
}

export const useLodPreview = ({ view, onTransform, currentTransform }: UseLodPreviewOptions) => {
  const previewLayerRef = useRef<GraphicsLayer | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewLodLevel, setPreviewLodLevel] = useState<number | null>(null);
  const [transformEnabled, setTransformEnabled] = useState(false);
  const originalNavigationRef = useRef<{ zoom: boolean; pan: boolean }>({ zoom: true, pan: true });
  const modelBlobUrlRef = useRef<string | null>(null);
  const sketchWidgetRef = useRef<Sketch | null>(null);
  const previewGraphicRef = useRef<Graphic | null>(null);


  const getAltitudeForLod = (lod: number): number => {
    switch (lod) {
      case 0:
        return ALTITUDE_THRESHOLDS.LOD0_MIN + 500;
      case 1:
        return ALTITUDE_THRESHOLDS.LOD1_MIN + 400;
      case 2:
        return ALTITUDE_THRESHOLDS.LOD2_MIN + 300;
      case 3:
        return 500;
      default:
        return 3000;
    }
  };

  const createPreviewSymbol = (type: string, height?: number) => {
    const highlightColor = [0, 149, 217];

    switch (type) {
      case 'Point':
        return new PointSymbol3D({
          symbolLayers: [
            new IconSymbol3DLayer({
              resource: { primitive: 'circle' },
              size: 15,
              material: { color: highlightColor },
            }),
          ],
          verticalOffset: {
            screenLength: 40,
          },
          callout: {
            type: 'line',
            color: highlightColor,
          },
        });

      case 'LineString':
        return new LineSymbol3D({
          symbolLayers: [
            new PathSymbol3DLayer({
              profile: 'circle',
              width: 1,
              material: { color: highlightColor },
            }),
          ],
        });

      case 'Polygon':
        return new PolygonSymbol3D({
          symbolLayers: [
            new FillSymbol3DLayer({
              material: { color: [...highlightColor, 0.7] },
              outline: {
                color: [0, 0, 0],
                size: 2,
              },
            }),
          ],
        });

      case 'MultiPolygon':
        // For simple MultiPolygon without multiple tiers (single height)
        return new PolygonSymbol3D({
          symbolLayers: [
            new ExtrudeSymbol3DLayer({
              size: height || 20,
              material: { color: highlightColor },
              edges: {
                type: 'solid',
                color: [0, 0, 0],
                size: 1.5,
              },
            }),
          ],
        });

      default:
        return new PointSymbol3D({
          symbolLayers: [
            new IconSymbol3DLayer({
              resource: { primitive: 'circle' },
              size: 10,
              material: { color: highlightColor },
            }),
          ],
        });
    }
  };


  const createGeometryFromCoordinates = (
    coordinates: any,
    type: string
  ): Point | Polyline | Polygon | null => {
    try {
      const sr = { wkid: 4326 };

      if (type === 'Point') {
        const coords = Array.isArray(coordinates[0]) ? coordinates[0] : coordinates;
        return new Point({
          x: coords[0],
          y: coords[1],
          z: coords[2] || 0,
          spatialReference: sr,
        });
      }

      if (type === 'LineString') {
        const paths = Array.isArray(coordinates[0])
          ? [coordinates]
          : [coordinates];

        const flattenedPaths = paths.map(path =>
          path.map((coord: any) => [coord[0], coord[1], 0])
        );

        const pathDetails = flattenedPaths[0]?.map((coord, idx) => ({
          index: idx,
          lon: coord[0],
          lat: coord[1],
          z: coord[2],
        })) || [];

        return new Polyline({
          paths: flattenedPaths as number[][][],
          spatialReference: sr,
        });
      }

      if (type === 'Polygon' || type === 'MultiPolygon') {
        let rings: number[][][] = [];

        if (type === 'Polygon') {
          rings = Array.isArray(coordinates[0][0])
            ? coordinates
            : [coordinates];
        } else {
          coordinates.forEach((polygon: any) => {
            if (polygon.coordinates) {
              rings.push(...polygon.coordinates);
            } else {
              rings.push(...polygon);
            }
          });
        }

        return new Polygon({
          rings: rings as number[][][],
          spatialReference: sr,
        });
      }
    } catch (error) {
      console.error('Error creating geometry:', error);
    }

    return null;
  };

  const startPreview = (lod: number, geometry: PreviewGeometry) => {
    if (!view) return;

    if (!previewLayerRef.current) {
      previewLayerRef.current = new GraphicsLayer({
        title: 'LOD Preview Layer',
        elevationInfo: {
          mode: 'absolute-height' as any,
        },
      });
      if (view.map) {
        view.map.add(previewLayerRef.current);
      }
    }

    previewLayerRef.current.removeAll();

    if (geometry.modelFile && geometry.anchorPoint) {
      if (modelBlobUrlRef.current) {
        URL.revokeObjectURL(modelBlobUrlRef.current);
      }

      const modelUrl = URL.createObjectURL(geometry.modelFile);
      modelBlobUrlRef.current = modelUrl;

      // Initialize ObjectSymbol3DLayer with current transform values to preserve them
      const modelScale = currentTransform?.scale || { x: 1, y: 1, z: 1 };
      const modelRotation = currentTransform?.rotation || { x: 0, y: 0, z: 0 };

      const modelSymbol = new PointSymbol3D({
        symbolLayers: [
          new ObjectSymbol3DLayer({
            resource: { href: modelUrl },
            width: modelScale.x * 100,
            height: modelScale.y * 100,
            depth: modelScale.z * 100,
            heading: modelRotation.z,
            tilt: modelRotation.x,
            roll: modelRotation.y,
          }),
        ],
      });

      const modelGraphic = new Graphic({
        geometry: geometry.anchorPoint,
        symbol: modelSymbol,
        attributes: {
          type: 'preview-model',
          lodLevel: lod,
        },
      });

      previewLayerRef.current.add(modelGraphic);
      previewGraphicRef.current = modelGraphic;

      originalNavigationRef.current = {
        zoom: view.navigation.mouseWheelZoomEnabled,
        pan: view.navigation.browserTouchPanEnabled,
      };
      view.navigation.browserTouchPanEnabled = false;

      setIsPreviewMode(true);
      setPreviewLodLevel(lod);

      setTimeout(() => {
        if (previewGraphicRef.current && !transformEnabled) {
          enableTransform();
        }
      }, 100);

      return;
    }

    if (geometry.type === 'MultiPolygon' && geometry.heights && Array.isArray(geometry.heights) && geometry.heights.length > 1) {
      const lodData: UrbanObjectLod = {
        id: 'preview-multipolygon',
        urbanObjectId: 'preview',
        lodLevel: lod as 0 | 1 | 2 | 3,
        enabled: true,
        geometryType: 'MultiPolygon',
        geom: {
          type: 'MultiPolygon',
          coordinates: geometry.coordinates,
        },
        heights: geometry.heights,
        modelAsset: null,
        modelAssetId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mesh = convertMultiPolygonToMesh(lodData, {
        extrude: true,
        heightScale: 1.0,
        customColors: geometry.heights.map(() => [0, 149, 217, 1] as [number, number, number, number]),
      });

      if (!mesh) {
        console.error('Failed to create mesh for MultiPolygon preview');
        return;
      }

      const meshSymbol = new MeshSymbol3D({
        symbolLayers: [
          new FillSymbol3DLayer({
            material: { color: [0, 149, 217, 1] },
            edges: {
              type: 'solid',
              color: [0, 100, 150],
              size: 1.5,
            } as any,
          }),
        ],
      });

      const graphic = new Graphic({
        geometry: mesh,
        symbol: meshSymbol,
        attributes: {
          type: 'preview',
          lodLevel: lod,
          geometryType: geometry.type,
        },
      });

      previewLayerRef.current.add(graphic);
      previewGraphicRef.current = graphic;

      originalNavigationRef.current = {
        zoom: view.navigation.mouseWheelZoomEnabled,
        pan: view.navigation.browserTouchPanEnabled,
      };

      view.navigation.browserTouchPanEnabled = false;

      setIsPreviewMode(true);
      setPreviewLodLevel(lod);
      return;
    }

    const geoGeometry = createGeometryFromCoordinates(geometry.coordinates, geometry.type);
    if (!geoGeometry) {
      console.error('Failed to create preview geometry');
      return;
    }

    const symbol = createPreviewSymbol(geometry.type, geometry.height);
    const graphic = new Graphic({
      geometry: geoGeometry,
      symbol,
      attributes: {
        type: 'preview',
        lodLevel: lod,
        geometryType: geometry.type,
      },
    });

    if (geometry.type === 'LineString') {
      (graphic as any).elevationInfo = {
        mode: 'on-the-ground',
      };
    } else if (geometry.type === 'Point') {
      (graphic as any).elevationInfo = {
        mode: 'relative-to-ground',
        offset: 0,
      };
    }

    previewLayerRef.current.add(graphic);
    previewGraphicRef.current = graphic;

    originalNavigationRef.current = {
      zoom: view.navigation.mouseWheelZoomEnabled,
      pan: view.navigation.browserTouchPanEnabled,
    };

    view.navigation.browserTouchPanEnabled = false;

    setIsPreviewMode(true);
    setPreviewLodLevel(lod);
  };

  const cancelPreview = () => {
    if (!view) return;

    if (transformEnabled) {
      disableTransform();
    }

    if (modelBlobUrlRef.current) {
      URL.revokeObjectURL(modelBlobUrlRef.current);
      modelBlobUrlRef.current = null;
    }

    if (previewLayerRef.current) {
      previewLayerRef.current.removeAll();
    }

    view.navigation.mouseWheelZoomEnabled = originalNavigationRef.current.zoom;
    view.navigation.browserTouchPanEnabled = originalNavigationRef.current.pan;

    previewGraphicRef.current = null;
    setIsPreviewMode(false);
    setPreviewLodLevel(null);
  };

  const enableTransform = () => {
    if (!view || !previewLayerRef.current || !previewGraphicRef.current) {
      console.warn('Cannot enable transform: preview not active');
      return;
    }

    const initialGraphic = previewGraphicRef.current;
    const initialPosition = {
      x: (initialGraphic.geometry as Point).x,
      y: (initialGraphic.geometry as Point).y,
      z: (initialGraphic.geometry as Point).z || 0,
    };

    const initialSymbol = initialGraphic.symbol as PointSymbol3D;
    const initialLayer = initialSymbol?.symbolLayers?.getItemAt(0) as ObjectSymbol3DLayer;
    const initialScale = {
      x: ((initialLayer as any).width || 100) / 100,
      y: ((initialLayer as any).height || 100) / 100,
      z: ((initialLayer as any).depth || 100) / 100,
    };
    const initialRotation = {
      x: (initialLayer as any).tilt || 0,
      y: (initialLayer as any).roll || 0,
      z: (initialLayer as any).heading || 0,
    };


    if (!sketchWidgetRef.current) {
      const sketch = new Sketch({
        view: view,
        layer: previewLayerRef.current,
        creationMode: 'update',
        availableCreateTools: [],
        visibleElements: {
          createTools: {
            point: false,
            polyline: false,
            polygon: false,
            rectangle: false,
            circle: false,
          },
          selectionTools: {
            'lasso-selection': false,
            'rectangle-selection': false,
          },
          settingsMenu: false,
          undoRedoMenu: false,
        },
        defaultUpdateOptions: {
          tool: 'transform',
          enableRotation: true,
          enableScaling: true,
          enableZ: true,
          preserveAspectRatio: false,
          toggleToolOnClick: false,
        },
      });

      const currentTransformState = {
        position: { ...initialPosition },
        rotation: { ...initialRotation },
        scale: { ...initialScale }
      };

      let dragStartScale = { ...initialScale };

      sketch.on('update', (event) => {
        if (event.graphics.length > 0 && onTransform) {
          const graphic = event.graphics[0];
          const toolType = event.toolEventInfo?.type || '';

          if (toolType.includes('start')) {
            dragStartScale = { ...currentTransformState.scale };
          }

          if (event.state === 'active' || event.state === 'complete') {
            const point = graphic.geometry as Point;
            const symbol = graphic.symbol as PointSymbol3D;
            const currentLayer = symbol?.symbolLayers?.getItemAt(0) as ObjectSymbol3DLayer;

            if (toolType.includes('rotate')) {
              currentTransformState.rotation = {
                x: (currentLayer as any).tilt || 0,
                y: (currentLayer as any).roll || 0,
                z: (currentLayer as any).heading || 0,
              };
            }

            else if (toolType.includes('scale')) {
              const currentWidth = (currentLayer as any).width || 100;
              const currentHeight = (currentLayer as any).height || 100;
              const currentDepth = (currentLayer as any).depth || 100;

              currentTransformState.scale = {
                x: currentWidth / 100,
                y: currentHeight / 100,
                z: currentDepth / 100,
              };
            }

            else if (toolType.includes('move')) {
              const epsilon = 1e-8;
              const currentRawPosition = {
                x: point.x,
                y: point.y,
                z: Math.abs(point.z || 0) < epsilon ? 0 : (point.z || 0),
              };

              currentTransformState.position = {
                x: initialPosition.x + (currentRawPosition.x - initialPosition.x),
                y: initialPosition.y + (currentRawPosition.y - initialPosition.y),
                z: initialPosition.z + (currentRawPosition.z - initialPosition.z),
              };
            }

            onTransform({
              position: currentTransformState.position,
              rotation: currentTransformState.rotation,
              scale: currentTransformState.scale
            });
          }
        }
      });

      sketchWidgetRef.current = sketch;
    }

    if (previewGraphicRef.current) {
      sketchWidgetRef.current.update(previewGraphicRef.current, {
        tool: 'transform',
        enableRotation: true,
        enableScaling: true,
        enableZ: true,
      });
    }

    setTransformEnabled(true);
  };

  const disableTransform = () => {
    if (sketchWidgetRef.current) {
      sketchWidgetRef.current.cancel();
    }
    setTransformEnabled(false);
  };


  useEffect(() => {
    return () => {
      if (sketchWidgetRef.current) {
        sketchWidgetRef.current.destroy();
        sketchWidgetRef.current = null;
      }

      if (modelBlobUrlRef.current) {
        URL.revokeObjectURL(modelBlobUrlRef.current);
      }

      if (previewLayerRef.current && view?.map) {
        try {
          view.map.remove(previewLayerRef.current);
        } catch (error) {
          console.error('Error removing preview layer:', error);
        }
      }
    };
  }, [view]);

  return {
    isPreviewMode,
    previewLodLevel,
    transformEnabled,
    startPreview,
    cancelPreview,
    enableTransform,
    disableTransform,
  };
};
