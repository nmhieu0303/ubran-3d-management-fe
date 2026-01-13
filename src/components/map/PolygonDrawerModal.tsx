import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Point from '@arcgis/core/geometry/Point';
import Polygon from '@arcgis/core/geometry/Polygon';
import Polyline from '@arcgis/core/geometry/Polyline';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import ExtrudeSymbol3DLayer from '@arcgis/core/symbols/ExtrudeSymbol3DLayer';
import FillSymbol3DLayer from '@arcgis/core/symbols/FillSymbol3DLayer';
import PointSymbol3D from '@arcgis/core/symbols/PointSymbol3D';
import IconSymbol3DLayer from '@arcgis/core/symbols/IconSymbol3DLayer';
import LineSymbol3D from '@arcgis/core/symbols/LineSymbol3D';
import PathSymbol3DLayer from '@arcgis/core/symbols/PathSymbol3DLayer';
import PolygonSymbol3D from '@arcgis/core/symbols/PolygonSymbol3D';
import SceneView from '@arcgis/core/views/SceneView';
import WebScene from '@arcgis/core/WebScene';
import Sketch from '@arcgis/core/widgets/Sketch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import UndoIcon from '@mui/icons-material/Undo';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getAnchorPointFromGeometry } from '../../utils/geometryAnchorUtils';

interface PolygonDrawerModalProps {
  open: boolean;
  lodLevel: number;
  geometryType?: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
  urbanObjectId?: string;
  initialCoordinates?:
    | number[][][]
    | number[][][][]
    | Array<{ coordinates: number[][][]; height: number }>;
  onClose: () => void;
  onSave: (
    coordinates:
      | number[][][]
      | number[][][][]
      | Array<{ coordinates: number[][][]; height: number }>,
    area: number,
    perimeter: number,
    geometryType: string
  ) => void;
  onAnchorPointReady?: (anchorPoint: Point) => void;
}

interface DrawingStats {
  area: number;
  perimeter: number;
  pointCount: number;
}

type InteractionMode = 'add' | 'select' | 'transform' | 'pan' | 'tilt';

const getSketchCreateTool = (geometryType: string): 'point' | 'polyline' | 'polygon' => {
  switch (geometryType) {
    case 'Point':
      return 'point';
    case 'LineString':
      return 'polyline';
    case 'Polygon':
    case 'MultiPolygon':
      return 'polygon';
    default:
      return 'polygon';
  }
};

const getSketchToolsForGeometryType = (geometryType: string): string[] => {
  switch (geometryType) {
    case 'Point':
      return ['point'];
    case 'LineString':
      return ['polyline'];
    case 'Polygon':
    case 'MultiPolygon':
      return ['polygon'];
    default:
      return ['polygon'];
  }
};

export const PolygonDrawerModal: React.FC<PolygonDrawerModalProps> = ({
  open,
  lodLevel,
  geometryType = 'Polygon',
  initialCoordinates,
  onClose,
  onSave,
  onAnchorPointReady,
}) => {
  const mapDiv = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);
  const sketchRef = useRef<Sketch | null>(null);
  const graphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const polygonHeightRef = useRef<number>(20);
  const zOffsetRef = useRef<number>(0);
  const keydownHandlerRef = useRef<((event: KeyboardEvent) => void) | null>(null);
  const isTiltingRef = useRef<boolean>(false);
  const tiltStartXRef = useRef<number>(0);
  const tiltStartYRef = useRef<number>(0);
  const tiltStartHeadingRef = useRef<number>(0);
  const tiltStartTiltRef = useRef<number>(0);
  const interactionModeRef = useRef<InteractionMode>('add');
  const selectedGraphicRef = useRef<__esri.Graphic | null>(null);

  const [stats, setStats] = useState<DrawingStats>({
    area: 0,
    perimeter: 0,
    pointCount: 0,
  });
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonCount, setPolygonCount] = useState(0);
  const [polygonHeight, setPolygonHeight] = useState<number>(20);
  const [zOffset, setZOffset] = useState<number>(0);

  const [interactionMode, setInteractionMode] = useState<InteractionMode>('add');
  const [selectedGraphic, setSelectedGraphic] = useState<__esri.Graphic | null>(null);


  useEffect(() => {
    polygonHeightRef.current = polygonHeight;
  }, [polygonHeight]);

  useEffect(() => {
    zOffsetRef.current = zOffset;
  }, [zOffset]);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  useEffect(() => {
    if (selectedGraphic) {
      const height = selectedGraphic.attributes?.height ?? 20;
      const zOffset = selectedGraphic.attributes?.zOffset ?? 0;
      setPolygonHeight(height);
      setZOffset(zOffset);
    }
  }, [selectedGraphic]);

  useEffect(() => {
    selectedGraphicRef.current = selectedGraphic;
  }, [selectedGraphic]);

  useEffect(() => {
    if (!graphicsLayerRef.current || graphicsLayerRef.current.graphics.length === 0) {
      return;
    }

    const firstGraphic = graphicsLayerRef.current.graphics.getItemAt(0);
    if (!firstGraphic || !firstGraphic.geometry) {
      return;
    }

    const point = getAnchorPointFromGeometry(firstGraphic.geometry, geometryType);

    if (point && onAnchorPointReady) {
      onAnchorPointReady(point);
    }
  }, [hasDrawing, polygonCount, geometryType, onAnchorPointReady]);


  const calculateStats = useCallback((geometry: __esri.Polygon): DrawingStats => {
    try {
      const areaSquareMeters = geometryEngine.geodesicArea(geometry, 'square-meters');

      const perimeterMeters = geometryEngine.geodesicLength(geometry, 'meters');

      const rings = geometry.rings[0] || [];
      const pointCount = rings.length > 0 ? rings.length - 1 : 0;

      return {
        area: Math.abs(areaSquareMeters),
        perimeter: Math.abs(perimeterMeters),
        pointCount,
      };
    } catch (error) {
      console.error('Error calculating geometry stats:', error);
      return {
        area: 0,
        perimeter: 0,
        pointCount: 0,
      };
    }
  }, []);


  const getColorByGeometryType = useCallback((type: string): [number, number, number] => {
    return [255, 165, 0];
  }, []);


  const createSymbolByType = useCallback((type: string, height?: number, selected?: boolean) => {
    const color = getColorByGeometryType(type);

    switch (type) {
      case 'Point':
        return new PointSymbol3D({
          symbolLayers: [
            new IconSymbol3DLayer({
              resource: { primitive: selected ? 'circle' : 'circle' },
              size: selected ? 20 : 15,
              material: { color },
            }),
          ],
          verticalOffset: {
            screenLength: selected ? 50 : 40,
          },
          callout: selected ? {
            type: 'line',
            color: color,
            size: 2,
          } : undefined,
        });

      case 'LineString':
        return new LineSymbol3D({
          symbolLayers: [
            new PathSymbol3DLayer({
              profile: 'circle',
              width: 1,
              material: { color },
            }),
          ],
        });

      case 'Polygon':
        return new PolygonSymbol3D({
          symbolLayers: [
            new FillSymbol3DLayer({
              material: { color: [...color, 0.6] },
              outline: {
                color: [0, 0, 0],
                size: 2,
              },
            }),
          ],
        });

      case 'MultiPolygon':
        if (height && height > 0) {
          return new PolygonSymbol3D({
            symbolLayers: [
              new ExtrudeSymbol3DLayer({
                size: height,
                material: { color },
                edges: {
                  type: 'solid' as const,
                  color: [0, 0, 0],
                  size: 1.5,
                } as any,
              }),
            ],
          });
        } else {
          return new PolygonSymbol3D({
            symbolLayers: [
              new FillSymbol3DLayer({
                material: { color: [...color, 0.6] },
                outline: {
                  color: [0, 0, 0],
                  size: 2,
                },
              }),
            ],
          });
        }

      default:
        return new PointSymbol3D({
          symbolLayers: [
            new IconSymbol3DLayer({
              resource: { primitive: 'circle' },
              size: 10,
              material: { color: [229, 229, 229] },
            }),
          ],
        });
    }
  }, [getColorByGeometryType]);

  useEffect(() => {
    if (selectedGraphic && graphicsLayerRef.current) {
      const height = selectedGraphic.attributes?.height ?? (geometryType === 'MultiPolygon' ? 20 : 0);
      selectedGraphic.symbol = createSymbolByType(geometryType || 'Polygon', height, true);
      graphicsLayerRef.current.remove(selectedGraphic);
      graphicsLayerRef.current.add(selectedGraphic);
    }
  }, [selectedGraphic, createSymbolByType, geometryType]);

  const applyZOffsetToPolygon = useCallback(
    (polygon: __esri.Polygon, offset: number): __esri.Polygon => {
      if (offset === 0) return polygon;

      const newRings = polygon.rings.map((ring) => ring.map(([x, y]) => [x, y, offset]));

      return new Polygon({
        rings: newRings,
        spatialReference: polygon.spatialReference,
      });
    },
    []
  );


  const getBasePolygon = useCallback((polygon: __esri.Polygon): __esri.Polygon => {
    const baseRings = polygon.rings.map((ring) => ring.map(([x, y]) => [x, y, 0]));

    return new Polygon({
      rings: baseRings,
      spatialReference: polygon.spatialReference,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initMap = () => {
      if (!mapDiv.current) {
        return;
      }


      const webscene = new WebScene({
        basemap: 'osm',
      });

      const graphicsLayer = new GraphicsLayer({
        id: `polygon-drawer-layer-lod${lodLevel}`,
        elevationInfo: {
          mode: 'absolute-height',
        } as any,
      });
      webscene.add(graphicsLayer);
      graphicsLayerRef.current = graphicsLayer;

      const cameraConfig = {
        position: {
          x: 106.719148,
          y: 10.762303,
          z: 2000,
          spatialReference: { wkid: 4326 },
        },
        heading: 0,
        tilt: 45,
      };

      const view = new SceneView({
        container: mapDiv.current,
        map: webscene,
        camera: cameraConfig,
        ui: {
          components: [],
        },
        environment: {
          lighting: {
            date: new Date(),
            directShadowsEnabled: true,
          },
          atmosphereEnabled: true,
          starsEnabled: false,
        },
      });

      viewRef.current = view;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (!view) return;
        const camera = view.camera.clone();
        const rotationStep = 5;
        const tiltStep = 3;

        switch (event.key.toLowerCase()) {
          case 'arrowup':
          case 'w':
            camera.tilt = Math.min(camera.tilt + tiltStep, 90);
            event.preventDefault();
            break;
          case 'arrowdown':
          case 's':
            camera.tilt = Math.max(camera.tilt - tiltStep, 0);
            event.preventDefault();
            break;
          case 'arrowleft':
          case 'a':
            camera.heading = (camera.heading + rotationStep) % 360;
            event.preventDefault();
            break;
          case 'arrowright':
          case 'd':
            camera.heading = (camera.heading - rotationStep) % 360;
            event.preventDefault();
            break;
        }
        view.camera = camera;
      };

      keydownHandlerRef.current = handleKeyDown;
      window.addEventListener('keydown', handleKeyDown);

      const handlePointerDown = (event: __esri.ViewPointerDownEvent) => {
        const currentMode = interactionModeRef.current;

        if (currentMode === 'transform' || currentMode === 'select') {
          view.hitTest(event).then((response) => {
            if (response.results.length > 0) {
              const result = response.results[0];
              if (result.type === 'graphic' && result.graphic.geometry?.type === 'polygon') {
                const graphic = result.graphic;

                if (graphic !== selectedGraphicRef.current) {
                  setSelectedGraphic(graphic);
                  selectedGraphicRef.current = graphic;

                  setInteractionMode('transform');
                  interactionModeRef.current = 'transform';

                  if (sketchRef.current) {
                    sketchRef.current.update(graphic, {
                      tool: 'transform',
                      enableRotation: true,
                      enableScaling: true,
                      enableZ: true,
                    });
                  }
                }
              }
            } else if (currentMode === 'select') {
              if (selectedGraphicRef.current) {
                setSelectedGraphic(null);
                selectedGraphicRef.current = null;
              }
            }
          });
        } else if (currentMode === 'tilt') {
          event.stopPropagation();
          isTiltingRef.current = true;
          tiltStartXRef.current = event.x;
          tiltStartYRef.current = event.y;
          tiltStartHeadingRef.current = view.camera.heading;
          tiltStartTiltRef.current = view.camera.tilt;
        }
      };

      const handlePointerMove = (event: __esri.ViewPointerMoveEvent) => {
        const currentMode = interactionModeRef.current;

        if (currentMode === 'transform') {
          return;
        }

        if (isTiltingRef.current && currentMode === 'tilt') {
          event.stopPropagation();
          const deltaX = event.x - tiltStartXRef.current;
          const deltaY = event.y - tiltStartYRef.current;

          const camera = view.camera.clone();
          camera.heading = (tiltStartHeadingRef.current - deltaX * 0.5) % 360;
          camera.tilt = Math.max(0, Math.min(90, tiltStartTiltRef.current + deltaY * 0.3));
          view.camera = camera;
        }
      };

      const handlePointerUp = () => {
        const currentMode = interactionModeRef.current;
        if (currentMode === 'transform') {
          return;
        }

        isTiltingRef.current = false;

        if (viewRef.current?.container) {
          switch (currentMode as string) {
            case 'select':
              viewRef.current.container.style.cursor = 'pointer';
              break;
            case 'transform':
              viewRef.current.container.style.cursor = 'move';
              break;
            case 'tilt':
              viewRef.current.container.style.cursor = 'move';
              break;
            case 'pan':
              viewRef.current.container.style.cursor = 'grab';
              break;
            case 'add':
              viewRef.current.container.style.cursor = 'crosshair';
              break;
          }
        }
      };

      const handleDrag = (event: __esri.ViewDragEvent) => {
        const currentMode = interactionModeRef.current;

        if (currentMode === 'transform') {
          return;
        }

        if (currentMode === 'tilt') {
          event.stopPropagation();

          if (event.action === 'start') {
            if (view.container) view.container.style.cursor = 'grabbing';
            isTiltingRef.current = true;
            tiltStartXRef.current = event.x;
            tiltStartYRef.current = event.y;
            tiltStartHeadingRef.current = view.camera.heading;
            tiltStartTiltRef.current = view.camera.tilt;
          } else if (event.action === 'update' && isTiltingRef.current) {
            const deltaX = event.x - tiltStartXRef.current;
            const deltaY = event.y - tiltStartYRef.current;

            const camera = view.camera.clone();
            camera.heading = (tiltStartHeadingRef.current - deltaX * 0.5) % 360;
            camera.tilt = Math.max(0, Math.min(90, tiltStartTiltRef.current + deltaY * 0.3));
            view.camera = camera;
          } else if (event.action === 'end') {
            if (view.container) view.container.style.cursor = 'move';
            isTiltingRef.current = false;
          }
        }
      };

      view.on('pointer-down', handlePointerDown);
      view.on('pointer-move', handlePointerMove);
      view.on('pointer-up', handlePointerUp);
      view.on('drag', handleDrag);

      view
        .when(() => {
          const availableTools = getSketchToolsForGeometryType(geometryType);

          const sketch = new Sketch({
            view,
            layer: graphicsLayer,
            creationMode: 'continuous',
            availableCreateTools: availableTools as any,
            defaultCreateOptions: {
              mode: 'click',
            },
            defaultUpdateOptions: {
              tool: 'transform',
              enableRotation: true,
              enableScaling: true,
              enableZ: true,
              multipleSelectionEnabled: false,
              toggleToolOnClick: false,
            },
            visibleElements: {
              createTools: {
                point: availableTools.includes('point'),
                polyline: availableTools.includes('polyline'),
                rectangle: false,
                circle: false,
              },
              selectionTools: {
                'lasso-selection': false,
                'rectangle-selection': false,
              },
              undoRedoMenu: false,
            },
          });

          sketchRef.current = sketch;

          sketch.on('create', (event) => {
            if (event.state === 'start') {
              setIsDrawing(true);
              setHasDrawing(false);
            }

            if (event.state === 'active') {
              if (event.graphic && event.graphic.geometry) {
                const geom = event.graphic.geometry;

                if (geom.type === 'polyline') {
                  const polyline = geom as __esri.Polyline;
                } else if (geom.type === 'polygon') {
                  const polygon = geom as __esri.Polygon;
                  const newStats = calculateStats(polygon);
                  setStats(newStats);
                }
              }
            }

            if (event.state === 'complete') {
              setIsDrawing(false);
              setHasDrawing(true);

              if (event.graphic && event.graphic.geometry) {
                const geom = event.graphic.geometry;
                const currentZOffset = zOffsetRef.current;
                const currentHeight = geometryType === 'MultiPolygon' ? polygonHeightRef.current : 0;

                if (geom.type === 'point') {
                  const point = geom as __esri.Point;
                  if (currentZOffset !== 0) {
                    const offsetPoint = new Point({
                      x: point.x,
                      y: point.y,
                      z: currentZOffset,
                      spatialReference: point.spatialReference,
                    });
                    event.graphic.geometry = offsetPoint;
                  }
                  event.graphic.attributes = {
                    height: currentHeight,
                    zOffset: currentZOffset,
                  };

                  setSelectedGraphic(event.graphic);
                  selectedGraphicRef.current = event.graphic;
                  setInteractionMode('transform');
                  interactionModeRef.current = 'transform';
                  sketch.update(event.graphic, {
                    tool: 'transform',
                    enableRotation: true,
                    enableScaling: true,
                    enableZ: true,
                  });
                } else if (geom.type === 'polyline') {
                  const polyline = geom as __esri.Polyline;
                  if (currentZOffset !== 0) {
                    const offsetPaths = polyline.paths.map(path =>
                      path.map(([x, y]) => [x, y, currentZOffset])
                    );
                    event.graphic.geometry = new Polyline({
                      paths: offsetPaths,
                      spatialReference: polyline.spatialReference,
                    });
                  }
                  event.graphic.attributes = {
                    height: currentHeight,
                    zOffset: currentZOffset,
                  };

                  setSelectedGraphic(event.graphic);
                  selectedGraphicRef.current = event.graphic;
                  setInteractionMode('transform');
                  interactionModeRef.current = 'transform';
                  sketch.update(event.graphic, {
                    tool: 'transform',
                    enableRotation: true,
                    enableScaling: true,
                    enableZ: true,
                  });
                } else if (geom.type === 'polygon') {
                  const polygon = geom as __esri.Polygon;

                  if (currentZOffset !== 0) {
                    const offsetPolygon = applyZOffsetToPolygon(polygon, currentZOffset);
                    event.graphic.geometry = offsetPolygon;
                  }

                  event.graphic.symbol = createSymbolByType(geometryType || 'Polygon', currentHeight, true);
                  event.graphic.attributes = {
                    height: currentHeight,
                    zOffset: currentZOffset,
                  };

                  setSelectedGraphic(event.graphic);
                  selectedGraphicRef.current = event.graphic;
                  setInteractionMode('transform');
                  interactionModeRef.current = 'transform';
                  sketch.update(event.graphic, {
                    tool: 'transform',
                    enableRotation: true,
                    enableScaling: true,
                    enableZ: true,
                  });
                }
              }

              const allPolygons = graphicsLayer.graphics
                .toArray()
                .filter((g) => g.geometry?.type === 'polygon')
                .map((g) => g.geometry as __esri.Polygon);

              setPolygonCount(allPolygons.length);

              const combinedStats = allPolygons.reduce(
                (acc, poly) => {
                  const stats = calculateStats(poly);
                  return {
                    area: acc.area + stats.area,
                    perimeter: acc.perimeter + stats.perimeter,
                    pointCount: acc.pointCount + stats.pointCount,
                  };
                },
                { area: 0, perimeter: 0, pointCount: 0 }
              );
              setStats(combinedStats);
            }

            if (event.state === 'cancel') {
              setIsDrawing(false);
              setHasDrawing(false);
              setStats({ area: 0, perimeter: 0, pointCount: 0 });
            }
          });

          sketch.on('update', (event) => {
            if (event.state === 'start') {
            }

            if (event.state === 'active') {
              if (event.graphics && event.graphics.length > 0) {
                event.graphics.forEach((graphic) => {
                  let calculatedZOffset = 0;
                  const height = geometryType === 'MultiPolygon' ? (graphic.attributes?.height ?? polygonHeightRef.current) : 0;

                  if (graphic.geometry?.type === 'point') {
                    const point = graphic.geometry as __esri.Point;
                    calculatedZOffset = point.z || 0;
                  } else if (graphic.geometry?.type === 'polyline') {
                    const polyline = graphic.geometry as __esri.Polyline;
                    if (polyline.paths.length > 0 && polyline.paths[0].length > 0) {
                      const firstPoint = polyline.paths[0][0];
                      if (firstPoint.length > 2) {
                        calculatedZOffset = firstPoint[2] || 0;
                      }
                    }
                  } else if (graphic.geometry?.type === 'polygon') {
                    const polygon = graphic.geometry as __esri.Polygon;
                    if (polygon.rings.length > 0 && polygon.rings[0].length > 0) {
                      const firstPoint = polygon.rings[0][0];
                      if (firstPoint.length > 2) {
                        calculatedZOffset = firstPoint[2] || 0;
                      }
                    }
                  }

                  graphic.attributes = {
                    ...graphic.attributes,
                    height,
                    zOffset: calculatedZOffset,
                  };

                  graphic.symbol = createSymbolByType(geometryType || 'Polygon', height, selectedGraphicRef.current === graphic);

                  if (selectedGraphicRef.current === graphic) {
                    setPolygonHeight(height);
                    setZOffset(calculatedZOffset);
                  }
                });
              }

              const allGraphics = graphicsLayer.graphics.toArray();

              const hasGeometries = allGraphics.length > 0;

              if (!hasGeometries) {
                setHasDrawing(false);
                setStats({ area: 0, perimeter: 0, pointCount: 0 });
              } else {
                const allPolygons = allGraphics
                  .filter((g) => g.geometry?.type === 'polygon')
                  .map((g) => g.geometry as __esri.Polygon);

                if (allPolygons.length > 0) {
                  const combinedStats = allPolygons.reduce(
                    (acc, poly) => {
                      const stats = calculateStats(poly);
                      return {
                        area: acc.area + stats.area,
                        perimeter: acc.perimeter + stats.perimeter,
                        pointCount: acc.pointCount + stats.pointCount,
                      };
                    },
                    { area: 0, perimeter: 0, pointCount: 0 }
                  );
                  setStats(combinedStats);
                } else {
                  setStats({ area: 0, perimeter: 0, pointCount: allGraphics.length });
                }

                setPolygonCount(allGraphics.length);
              }
            }

            if (event.state === 'complete') {
              if (event.graphics && event.graphics.length > 0) {
                event.graphics.forEach((graphic) => {
                  let finalZOffset = 0;
                  const height = geometryType === 'MultiPolygon' ? (graphic.attributes?.height ?? 20) : 0;

                  if (graphic.geometry?.type === 'point') {
                    const point = graphic.geometry as __esri.Point;
                    finalZOffset = point.z || 0;
                  } else if (graphic.geometry?.type === 'polyline') {
                    const polyline = graphic.geometry as __esri.Polyline;
                    if (polyline.paths.length > 0 && polyline.paths[0].length > 0) {
                      const firstPoint = polyline.paths[0][0];
                      if (firstPoint.length > 2) {
                        finalZOffset = firstPoint[2] || 0;
                      }
                    }
                  } else if (graphic.geometry?.type === 'polygon') {
                    const polygon = graphic.geometry as __esri.Polygon;
                    if (polygon.rings.length > 0 && polygon.rings[0].length > 0) {
                      const firstPoint = polygon.rings[0][0];
                      if (firstPoint.length > 2) {
                        finalZOffset = firstPoint[2] || 0;
                      }
                    }
                  }

                  graphic.attributes = {
                    ...graphic.attributes,
                    height,
                    zOffset: finalZOffset,
                  };

                  if (selectedGraphicRef.current === graphic) {
                    setPolygonHeight(height);
                    setZOffset(finalZOffset);
                  }
                });
              }
            }
          });

          sketch.on('delete', () => {
            const allGraphics = graphicsLayer.graphics.toArray();

            if (allGraphics.length === 0) {
              setHasDrawing(false);
              setStats({ area: 0, perimeter: 0, pointCount: 0 });
              setPolygonCount(0);
            } else {
              const allPolygons = allGraphics
                .filter((g) => g.geometry?.type === 'polygon')
                .map((g) => g.geometry as __esri.Polygon);

              if (allPolygons.length > 0) {
                const combinedStats = allPolygons.reduce(
                  (acc, poly) => {
                    const stats = calculateStats(poly);
                    return {
                      area: acc.area + stats.area,
                      perimeter: acc.perimeter + stats.perimeter,
                      pointCount: acc.pointCount + stats.pointCount,
                    };
                  },
                  { area: 0, perimeter: 0, pointCount: 0 }
                );
                setStats(combinedStats);
              } else {
                setStats({ area: 0, perimeter: 0, pointCount: allGraphics.length });
              }

              setPolygonCount(allGraphics.length);
            }
          });

          if (initialCoordinates && initialCoordinates.length > 0) {

            let coordsArray: number[][][][];

            try {
              if (geometryType === 'Point' && Array.isArray(initialCoordinates) && initialCoordinates.length >= 2 && typeof initialCoordinates[0] === 'number') {
                const coords = initialCoordinates as any as number[];
                const [lon, lat, elev = 0] = [coords[0], coords[1], coords[2]];
                const point = new Point({
                  x: lon,
                  y: lat,
                  z: elev,
                  spatialReference: { wkid: 4326 },
                  hasZ: true,
                });

                const graphic = new Graphic({
                  geometry: point,
                  symbol: createSymbolByType('Point', undefined, false),
                  attributes: {
                    type: 'Point',
                    elevation: elev,
                  },
                });

                graphicsLayer.add(graphic);
                setPolygonCount(1);
                setStats({ area: 0, perimeter: 0, pointCount: 1 });
                setHasDrawing(true);
                view.goTo(graphic).catch((err) => console.error('Error zooming to point:', err));
                return;
              }

              if (geometryType === 'LineString' && Array.isArray(initialCoordinates) && initialCoordinates.length > 0 && Array.isArray(initialCoordinates[0])) {
                const paths = (initialCoordinates as any as number[][]).map((coord) => [coord[0], coord[1], 0]);
                const polyline = new Polyline({
                  paths: [paths],
                  spatialReference: { wkid: 4326 },
                  hasZ: true,
                });

                const graphic = new Graphic({
                  geometry: polyline,
                  symbol: createSymbolByType('LineString', undefined, false),
                  attributes: {
                    type: 'LineString',
                    pointCount: paths.length,
                  },
                });

                graphicsLayer.add(graphic);
                setPolygonCount(1);
                setStats({ area: 0, perimeter: 0, pointCount: paths.length });
                setHasDrawing(true);
                view.goTo(graphic).catch((err) => console.error('Error zooming to linestring:', err));
                return;
              }

              if (
                initialCoordinates.length > 0 &&
                typeof initialCoordinates[0] === 'object' &&
                initialCoordinates[0] !== null &&
                'coordinates' in initialCoordinates[0]
              ) {
                coordsArray = (
                  initialCoordinates as Array<{ coordinates: number[][][]; height: number }>
                ).map((item) => item.coordinates);
              } else if (initialCoordinates.length > 0 && Array.isArray(initialCoordinates[0])) {
                coordsArray = Array.isArray(initialCoordinates[0][0]?.[0])
                  ? (initialCoordinates as number[][][][])
                  : [initialCoordinates as number[][][]];
              } else {
                console.warn('Unsupported initialCoordinates format:', initialCoordinates);
                return;
              }

              const graphics: __esri.Graphic[] = [];
              coordsArray.forEach((rings: number[][][]) => {
                const firstCoordZ = rings[0]?.[0]?.[2] ?? 0;

                let polygon = new Polygon({
                  rings: rings,
                  spatialReference: { wkid: 4326 },
                  hasZ: true,
                });

                if (firstCoordZ !== 0) {
                  polygon = applyZOffsetToPolygon(polygon, firstCoordZ);
                }

                const displayHeight = geometryType === 'MultiPolygon' ? polygonHeightRef.current : 0;
                const graphic = new Graphic({
                  geometry: polygon,
                  symbol: createSymbolByType(geometryType || 'Polygon', displayHeight, false),
                  attributes: {
                    height: displayHeight,
                    zOffset: firstCoordZ,
                  },
                });

                graphicsLayer.add(graphic);
                graphics.push(graphic);
              });

              const allPolygons = graphics.map((g) => g.geometry as __esri.Polygon);
              setPolygonCount(allPolygons.length);
              const combinedStats = allPolygons.reduce(
                (acc, poly) => {
                  const stats = calculateStats(poly);
                  return {
                    area: acc.area + stats.area,
                    perimeter: acc.perimeter + stats.perimeter,
                    pointCount: acc.pointCount + stats.pointCount,
                  };
                },
                { area: 0, perimeter: 0, pointCount: 0 }
              );
              setStats(combinedStats);
              setHasDrawing(true);

              view.goTo(graphics).catch((err) => console.error('Error zooming to polygons:', err));
            } catch (error) {
              console.error('Error processing initial coordinates:', error);
              sketch.create(getSketchCreateTool(geometryType));
            }
          } else {
            sketch.create(getSketchCreateTool(geometryType));
          }
        })
        .catch((error) => {
          console.error('Error initializing SceneView:', error);
        });
    };

    const timeoutId = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timeoutId);

      if (keydownHandlerRef.current) {
        window.removeEventListener('keydown', keydownHandlerRef.current);
      }

      if (sketchRef.current) {
        sketchRef.current.destroy();
        sketchRef.current = null;
      }
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      graphicsLayerRef.current = null;
    };
  }, [
    open,
    lodLevel,
    geometryType,
    initialCoordinates,
    calculateStats,
    createSymbolByType,
    applyZOffsetToPolygon,
    getBasePolygon,
  ]);

  useEffect(() => {
    if (!viewRef.current) return;

    const view = viewRef.current;

    switch (interactionMode) {
      case 'add':
        if (view.container) view.container.style.cursor = 'crosshair';
        view.navigation.mouseWheelZoomEnabled = true;
        view.navigation.browserTouchPanEnabled = false;
        if (sketchRef.current) {
          sketchRef.current.create(getSketchCreateTool(geometryType));
        }
        break;
      case 'select':
        if (view.container) view.container.style.cursor = 'pointer';
        view.navigation.mouseWheelZoomEnabled = true;
        view.navigation.browserTouchPanEnabled = false;
        if (sketchRef.current) {
          sketchRef.current.cancel();
        }
        break;
      case 'transform':
        if (view.container) view.container.style.cursor = 'move';
        view.navigation.mouseWheelZoomEnabled = true;
        view.navigation.browserTouchPanEnabled = false;
        if (sketchRef.current) {
          const graphics = graphicsLayerRef.current?.graphics.toArray();
          if (graphics && graphics.length > 0 && selectedGraphic) {
            sketchRef.current.update(selectedGraphic, {
              tool: 'transform',
              enableRotation: true,
              enableScaling: true,
              enableZ: true,
            });
          }
        }
        break;
      case 'pan':
        if (view.container) view.container.style.cursor = 'grab';
        view.navigation.mouseWheelZoomEnabled = true;
        view.navigation.browserTouchPanEnabled = true;
        if (sketchRef.current) {
          sketchRef.current.cancel();
        }
        break;
      case 'tilt':
        if (view.container) view.container.style.cursor = 'move';
        view.navigation.mouseWheelZoomEnabled = true;
        view.navigation.browserTouchPanEnabled = false;
        if (sketchRef.current) {
          sketchRef.current.cancel();
        }
        break;
    }
  }, [interactionMode, geometryType]);


  const handleDeleteSelected = useCallback(() => {
    const currentSelected = selectedGraphicRef.current;
    if (!currentSelected || !graphicsLayerRef.current) return;

    graphicsLayerRef.current.remove(currentSelected);
    setSelectedGraphic(null);
    selectedGraphicRef.current = null;

    const allGraphics = graphicsLayerRef.current.graphics.toArray();

    if (allGraphics.length === 0) {
      setHasDrawing(false);
      setStats({ area: 0, perimeter: 0, pointCount: 0 });
      setPolygonCount(0);
    } else {
      const allPolygons = allGraphics
        .filter((g) => g.geometry?.type === 'polygon')
        .map((g) => g.geometry as __esri.Polygon);

      if (allPolygons.length > 0) {
        const combinedStats = allPolygons.reduce(
          (acc, poly) => {
            const stats = calculateStats(poly);
            return {
              area: acc.area + stats.area,
              perimeter: acc.perimeter + stats.perimeter,
              pointCount: acc.pointCount + stats.pointCount,
            };
          },
          { area: 0, perimeter: 0, pointCount: 0 }
        );
        setStats(combinedStats);
      } else {
        setStats({ area: 0, perimeter: 0, pointCount: allGraphics.length });
      }

      setPolygonCount(allGraphics.length);
    }
  }, [calculateStats]);


  const handleZOffsetChange = useCallback(
    (newZOffset: number) => {
      setZOffset(newZOffset);

      const currentSelected = selectedGraphicRef.current;
      if (currentSelected && graphicsLayerRef.current) {
        if (currentSelected.geometry?.type === 'point') {
          const point = currentSelected.geometry as __esri.Point;
          currentSelected.geometry = new Point({
            x: point.x,
            y: point.y,
            z: newZOffset,
            spatialReference: point.spatialReference,
          });
        } else if (currentSelected.geometry?.type === 'polyline') {
          const polyline = currentSelected.geometry as __esri.Polyline;
          const offsetPaths = polyline.paths.map(path =>
            path.map(([x, y]) => [x, y, newZOffset])
          );
          currentSelected.geometry = new Polyline({
            paths: offsetPaths,
            spatialReference: polyline.spatialReference,
          });
        } else if (currentSelected.geometry?.type === 'polygon') {
          const polygon = currentSelected.geometry as __esri.Polygon;
          const basePolygon = getBasePolygon(polygon);
          const offsetPolygon = applyZOffsetToPolygon(basePolygon, newZOffset);
          currentSelected.geometry = offsetPolygon;
        }

        currentSelected.attributes = {
          ...currentSelected.attributes,
          zOffset: newZOffset,
        };

        graphicsLayerRef.current.remove(currentSelected);
        graphicsLayerRef.current.add(currentSelected);
      }
    },
    [applyZOffsetToPolygon, getBasePolygon]
  );

  const handleHeightChange = useCallback(
    (newHeight: number) => {
      setPolygonHeight(newHeight);

      const currentSelected = selectedGraphicRef.current;
      if (currentSelected && geometryType === 'MultiPolygon' && graphicsLayerRef.current) {
        currentSelected.symbol = createSymbolByType(geometryType || 'Polygon', newHeight, true);
        currentSelected.attributes = {
          ...currentSelected.attributes,
          height: newHeight,
        };

        graphicsLayerRef.current.remove(currentSelected);
        graphicsLayerRef.current.add(currentSelected);
      }
    },
    [createSymbolByType, geometryType]
  );

  const handleUndo = useCallback(() => {
    if (sketchRef.current) {
      sketchRef.current.undo();
    }
  }, []);


  const handleReset = useCallback(() => {
    if (graphicsLayerRef.current) {
      graphicsLayerRef.current.removeAll();
    }
    setHasDrawing(false);
    setIsDrawing(false);
    setPolygonCount(0);
    setStats({ area: 0, perimeter: 0, pointCount: 0 });

    if (sketchRef.current) {
      sketchRef.current.create(getSketchCreateTool(geometryType));
    }
  }, [geometryType]);

  const handleSave = useCallback(() => {
    if (sketchRef.current) {
      sketchRef.current.cancel();
    }

    if (!graphicsLayerRef.current || graphicsLayerRef.current.graphics.length === 0) {
      return;
    }

    const allGraphics = graphicsLayerRef.current.graphics.toArray();

    if (allGraphics.length === 0) {
      return;
    }

    let finalCoordinates: any;

    if (geometryType === 'Point') {
      const points: number[][] = [];
      allGraphics.forEach((graphic) => {
        if (graphic.geometry?.type === 'point') {
          let point = graphic.geometry as __esri.Point;
          if (point.spatialReference?.isWebMercator) {
            point = webMercatorUtils.webMercatorToGeographic(point) as __esri.Point;
          }
          const elevation = graphic.attributes?.zOffset ?? 0;
          points.push([point.x, point.y, elevation]);
        }
      });
      finalCoordinates = points.length === 1 ? points[0] : points;
    } else if (geometryType === 'LineString') {
      const lines: number[][][] = [];
      allGraphics.forEach((graphic) => {
        if (graphic.geometry?.type === 'polyline') {
          let polyline = graphic.geometry as __esri.Polyline;
          if (polyline.spatialReference?.isWebMercator) {
            polyline = webMercatorUtils.webMercatorToGeographic(polyline) as __esri.Polyline;
          }
          const elevation = graphic.attributes?.zOffset ?? 0;
          const paths = polyline.paths.map((path) => path.map(([x, y]) => [x, y, elevation]));
          if (polyline.paths.length === 1) {
            lines.push(paths[0]);
          } else {
            lines.push(...paths);
          }
        }
      });
      finalCoordinates = lines.length === 1 ? lines[0] : lines;
    } else {
      const allCoordinates: Array<{ coordinates: number[][][]; height: number }> = allGraphics
        .filter((g) => g.geometry?.type === 'polygon')
        .map((graphic) => {
          let polygon = graphic.geometry as __esri.Polygon;

          if (polygon.spatialReference?.isWebMercator) {
            const geographicPolygon = webMercatorUtils.webMercatorToGeographic(
              polygon
            ) as __esri.Polygon;
            polygon = geographicPolygon;
          }

          const graphicZOffset = graphic.attributes?.zOffset ?? 0;
          const graphicHeight = graphic.attributes?.height ?? 0;

          const coordinates: number[][][] = polygon.rings.map(
            (ring) => ring.map(([x, y]) => [x, y, graphicZOffset])
          );

          return {
            coordinates,
            height: graphicHeight,
          };
        });

      if (allCoordinates.length === 1) {
        finalCoordinates = allCoordinates[0].coordinates;
      } else {
        finalCoordinates = allCoordinates.map((item) => ({
          coordinates: item.coordinates,
          height: item.height,
        }));
      }
    }

    onSave(finalCoordinates, stats.area, stats.perimeter, geometryType);
    onClose();
  }, [stats, onSave, onClose, geometryType]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '900px',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Vẽ {geometryType} cho LOD {lodLevel}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ p: 0, position: 'relative', height: 'calc(90vh - 140px)', overflow: 'hidden' }}
      >
        {/* Map Container */}
        <Box
          ref={mapDiv}
          sx={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Interaction Mode Toggle - Top Left */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            p: 1.5,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          <Typography variant="caption" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
            Chế độ tương tác
            {geometryType !== 'MultiPolygon' && (
              <Typography
                component="span"
                variant="caption"
                sx={{
                  ml: 1,
                  px: 0.75,
                  py: 0.25,
                  backgroundColor: 'info.light',
                  color: 'info.contrastText',
                  borderRadius: 0.5,
                  fontSize: '0.65rem',
                }}
              >
                Chế độ 2D
              </Typography>
            )}
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            <Button
              variant={interactionMode === 'add' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => {
                setInteractionMode('add');
                setSelectedGraphic(null);
                if (sketchRef.current) {
                  sketchRef.current.create(getSketchCreateTool(geometryType));
                }
              }}
              disabled={hasDrawing && geometryType !== 'MultiPolygon'}
              startIcon={<span>✏️</span>}
            >
              Thêm {geometryType}
            </Button>
            <Button
              variant={interactionMode === 'select' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setInteractionMode('select')}
              startIcon={<span>👆</span>}
            >
              Chọn
            </Button>
            <Button
              variant={interactionMode === 'pan' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setInteractionMode('pan')}
              startIcon={<span>🤚</span>}
            >
              Di chuyển
            </Button>
            {/* Only show Tilt/Rotate for 3D MultiPolygon */}
            {geometryType === 'MultiPolygon' && (
              <Button
                variant={interactionMode === 'tilt' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setInteractionMode('tilt')}
                startIcon={<span>🔄</span>}
              >
                Xoay/Tilt
              </Button>
            )}
          </Box>
        </Paper>

        {/* Height Control Panel - Show when object is selected */}
        {selectedGraphic && (
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              p: 2,
              minWidth: '220px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              {geometryType === 'MultiPolygon' ? '🏢' : geometryType === 'Polygon' ? '📐' : geometryType === 'LineString' ? '📏' : '📍'} {geometryType} Controls
            </Typography>

            {/* Height Control - Only for MultiPolygon */}
            {geometryType === 'MultiPolygon' && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Height (Extrusion)
                </Typography>
                <TextField
                  label="Height (meters)"
                  type="number"
                  value={polygonHeight}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      handleHeightChange(value);
                    }
                  }}
                  size="small"
                  fullWidth
                  sx={{ mt: 0.5 }}
                  InputProps={{
                    inputProps: {
                      min: 0,
                      max: 1000,
                      step: 1,
                    },
                  }}
                />
              </>
            )}

            {/* Z-Offset (Elevation) Control - For all types */}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Z-Offset (Base Elevation)
            </Typography>
            <TextField
              label="Elevation (meters)"
              type="number"
              value={zOffset}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  handleZOffsetChange(value);
                  const currentSelected = selectedGraphicRef.current;
                  if (currentSelected) {
                    const polygon = currentSelected.geometry as __esri.Polygon;
                    const basePolygon = getBasePolygon(polygon);
                    const offsetPolygon = applyZOffsetToPolygon(basePolygon, value);
                    currentSelected.geometry = offsetPolygon;
                    currentSelected.attributes = {
                      ...currentSelected.attributes,
                      zOffset: value,
                    };
                  }
                }
              }}
              size="small"
              fullWidth
              sx={{ mt: 0.5 }}
              InputProps={{
                inputProps: {
                  min: -500,
                  max: 500,
                  step: 1,
                },
              }}
            />

            <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
              <Typography variant="caption">Z-offset for stacking polygons vertically</Typography>
            </Alert>
          </Paper>
        )}



        {/* Drawing Controls */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            p: 1,
            display: 'flex',
            gap: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          <Tooltip title="Hoàn tác điểm cuối cùng">
            <span>
              <IconButton onClick={handleUndo} disabled={!isDrawing} color="primary" size="small">
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Đặt lại và bắt đầu lại">
            <IconButton onClick={handleReset} color="warning" size="small">
              <RestartAltIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Xóa đa giác đã chọn">
            <span>
              <IconButton
                onClick={handleDeleteSelected}
                disabled={!selectedGraphic}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Lưu">
            <span>
              <IconButton onClick={handleSave} disabled={!hasDrawing} color="success" size="small">
                <CheckCircleIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Huỷ
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!hasDrawing}
          startIcon={<CheckCircleIcon />}
        >
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
};
