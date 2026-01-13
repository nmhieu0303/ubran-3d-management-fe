import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SceneView from '@arcgis/core/views/SceneView';
import Sketch from '@arcgis/core/widgets/Sketch';
import Point from '@arcgis/core/geometry/Point';
import Polygon from '@arcgis/core/geometry/Polygon';
import Polyline from '@arcgis/core/geometry/Polyline';
import {
  Add as AddIcon,
  Layers as LayersIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AltitudeLodBox } from '../../components/AltitudeLodBox';
import { EnvironmentSettings } from '../../components/EnvironmentSettings';
import { LayerPanel } from '../../components/LayerPanel';
import { MapContainer } from '../../components/MapContainer';
import { ObjectDetailPanel } from '../../components/ObjectDetailPanel';
import { ObjectEditPanel } from '../../components/ObjectEditPanel';
import { SearchPanel } from '../../components/SearchPanel';
import { ALTITUDE_THRESHOLDS, LOD_LEVELS } from '../../constants';
import { useSketchEditor } from '../../hooks/useSketchEditor';
import { useUrbanObjects } from '../../hooks/useUrbanObjects';
import { useAuthStore } from '../../store/authStore';
import { useMapStore } from '../../store/mapStore';
import type { UrbanObject } from '../../types/feature.types';
import type { Transform } from '../../utils/geometryUtils';
import { canAdd } from '../../utils/permissions';

export const MapViewPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    searchPanelOpen,
    layerPanelOpen,
    toggleSearchPanel,
    toggleLayerPanel,
    pendingObjectSelection,
    setPendingObjectSelection,
    pendingAddObject,
    setPendingAddObject,
    filteredObjectTypes,
  } = useMapStore();
  const { user } = useAuthStore();

  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const layerButtonRef = useRef<HTMLButtonElement>(null);

  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(null);
  const [layerAnchorEl, setLayerAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [pendingObjectId, setPendingObjectId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [editPanelHasChanges, setEditPanelHasChanges] = useState(false);

  const [transformEnabled, setTransformEnabled] = useState(false);
  const [sketchWidget, setSketchWidget] = useState<__esri.Sketch | null>(null);
  const sketchLayerRef = useRef<__esri.GraphicsLayer | null>(null);

  const [currentTransform, setCurrentTransform] = useState<Partial<Transform> | null>(null);

  const userCanAdd = canAdd(user?.role);

  const [altitude, setAltitude] = useState<number>(0);
  const [lod, setLod] = useState<string>(LOD_LEVELS.LOD0);

  const viewRef = useRef<SceneView | null>(null);
  const [sceneView, setSceneView] = useState<SceneView | undefined>(undefined);

  const [environmentPanelOpen, setEnvironmentPanelOpen] = useState(false);
  const environmentButtonRef = useRef<HTMLButtonElement>(null);

  const editStateRef = useRef({ editPanelOpen, editingObjectId, editPanelHasChanges });

  useEffect(() => {
    editStateRef.current = { editPanelOpen, editingObjectId, editPanelHasChanges };
  }, [editPanelOpen, editingObjectId, editPanelHasChanges]);

  const {
    urbanObjects,
    currentLodLevel,
    isLoading,
    refresh,
    highlight,
    clearHighlight,
    getAllGraphicsById,
    hideGraphics,
    showGraphics,
    applyTransform,
    removeObject,
  } = useUrbanObjects({
    view: sceneView,
    autoUpdate: true,
    initialAltitude: 5000,
    filteredObjectTypes: filteredObjectTypes,
    onObjectClick: (objectId) => {
      const { editPanelOpen: isEditOpen, editingObjectId: currentEditingId } = editStateRef.current;

      if (isEditOpen) {
        setPendingObjectId(objectId);
        setShowConfirmDialog(true);
        return;
      }

      setSelectedObjectId(objectId);
      setDetailPanelOpen(true);
      highlight(objectId);
    },
  });

  const sketchEditor = useSketchEditor({
    view: sceneView || null,
    onTransformChange: (objectId, transform) => {
      setCurrentTransform(transform);

      if (transform.position || transform.rotation || transform.scale) {
        const fullTransform: Transform = {
          position: transform.position || { x: 0, y: 0, z: 0 },
          rotation: transform.rotation || { x: 0, y: 0, z: 0 },
          scale: transform.scale || { x: 1, y: 1, z: 1 },
        };
        applyTransform(objectId, fullTransform);
      }
    },
    onHideOriginal: (objectId) => {
      hideGraphics(objectId);
    },
    onShowOriginal: (objectId) => {
      showGraphics(objectId);
    },
  });

  useEffect(() => {
  }, [urbanObjects, currentLodLevel, isLoading, sceneView]);

  const calculateZoomTarget = (object: UrbanObject) => {
    if (!object?.currentLod?.geom) return null;

    const geometry = object?.currentLod?.geom;
    let zoomTarget = null;

    if (geometry.type === 'Point') {
      const [lon, lat, z] = geometry.coordinates;
      const point = new Point({
        longitude: lon,
        latitude: lat,
        z: z || 0,
      });

      zoomTarget = {
        target: point,
        zoom: 18,
        tilt: 45,
      };
    } else if (geometry.type === 'LineString') {
      const polyline = new Polyline({
        paths: [geometry.coordinates],
        spatialReference: { wkid: 4326 },
      });

      zoomTarget = {
        target: polyline,
        tilt: 45,
      };
    } else if (geometry.type === 'Polygon') {
      const polygon = new Polygon({
        rings: geometry.coordinates,
        spatialReference: { wkid: 4326 },
      });

      zoomTarget = {
        target: polygon,
        tilt: 45,
      };
    } else if (geometry.type === 'MultiPolygon') {
      const allRings: number[][][] = [];
      geometry.coordinates.forEach((polygonCoords: number[][][]) => {
        polygonCoords.forEach((ring: number[][]) => {
          allRings.push(ring);
        });
      });

      const polygon = new Polygon({
        rings: allRings,
        spatialReference: { wkid: 4326 },
      });

      zoomTarget = {
        target: polygon,
        tilt: 45,
      };
    }

    return zoomTarget;
  };

  useEffect(() => {
    if (pendingObjectSelection && urbanObjects.length > 0 && !isLoading) {
      const { objectId, mode } = pendingObjectSelection;

      const object = urbanObjects.find((obj) => obj.id === objectId);
      if (object) {
        highlight(objectId);

        const zoomTarget = calculateZoomTarget(object);
        if (zoomTarget && viewRef.current) {
          viewRef.current.goTo(zoomTarget, {
            duration: 1500,
            easing: 'ease-in-out',
          }).catch((error) => {
            console.error('Error zooming to object:', error);
          });
        }

        if (mode === 'view') {
          setSelectedObjectId(objectId);
          setDetailPanelOpen(true);
          setEditPanelOpen(false);
        } else if (mode === 'edit') {
          setEditingObjectId(objectId);
          setEditPanelOpen(true);
          setDetailPanelOpen(false);
        }
      }

      setPendingObjectSelection(null);
    }
  }, [pendingObjectSelection, urbanObjects, isLoading, highlight, setPendingObjectSelection]);

  useEffect(() => {
    if (pendingAddObject) {
      setEditingObjectId(null);
      setDetailPanelOpen(false);
      setEditPanelOpen(true);
      setEditPanelHasChanges(false);
      setPendingAddObject(false);
    }
  }, [pendingAddObject, setPendingAddObject]);

  const handleViewReady = useCallback(() => {
  }, []);

  const handleViewCreated = useCallback((view: SceneView) => {
    viewRef.current = view;
    setSceneView(view);

    view.watch('camera.position.z', (z: number) => {
      const alt = Math.round(z);
      setAltitude(alt);
      let lodLevel: string = LOD_LEVELS.LOD0;
      if (z >= ALTITUDE_THRESHOLDS.LOD0_MIN) {
        lodLevel = LOD_LEVELS.LOD0;
      } else if (z >= ALTITUDE_THRESHOLDS.LOD1_MIN) {
        lodLevel = LOD_LEVELS.LOD1;
      } else if (z >= ALTITUDE_THRESHOLDS.LOD2_MIN) {
        lodLevel = LOD_LEVELS.LOD2;
      } else {
        lodLevel = LOD_LEVELS.LOD3;
      }
      setLod(lodLevel);
    });

  }, []);

  useEffect(() => {
    if (!sceneView || !transformEnabled) {
      if (sketchWidget) {
        sketchWidget.destroy();
        setSketchWidget(null);
      }
      if (sketchLayerRef.current && sceneView?.map) {
        sceneView.map.remove(sketchLayerRef.current);
        sketchLayerRef.current = null;
      }
      return;
    }

    if (!sketchLayerRef.current) {
      sketchLayerRef.current = new GraphicsLayer({
        title: 'Transform Layer',
        elevationInfo: {
          mode: 'absolute-height',
        },
      });
      sceneView?.map.add(sketchLayerRef.current);
    }

    const sketch = new Sketch({
      view: sceneView,
      layer: sketchLayerRef.current,
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
          'lasso-selection': true,
          'rectangle-selection': true,
        },
        settingsMenu: true,
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

    sketch.on('update', (event) => {
      if (event.state === 'complete') {
      }
    });

    setSketchWidget(sketch);

    return () => {
      sketch.destroy();
    };
  }, [sceneView, transformEnabled]);

  const handleTransformToggle = useCallback((enabled: boolean) => {
    setTransformEnabled(enabled);

    if (!enabled && sketchLayerRef.current) {
      sketchLayerRef.current.removeAll();
    }
  }, []);

  const handleSearchClick = () => {
    setSearchAnchorEl(searchButtonRef.current);
    toggleSearchPanel();
  };

  const handleLayerClick = () => {
    setLayerAnchorEl(layerButtonRef.current);
    toggleLayerPanel();
  };

  const handleSearchClose = () => {
    setSearchAnchorEl(null);
    toggleSearchPanel();
  };

  const handleLayerClose = () => {
    setLayerAnchorEl(null);
    toggleLayerPanel();
  };

  const handleFeatureSelect = (feature: any) => {
    if (feature?.id) {
      highlight(feature.id);

      if (viewRef.current && feature.geometry) {
        viewRef.current
          .goTo({
            target: feature.geometry,
            zoom: 17,
            tilt: 60,
          })
          .catch((error) => {
            console.error('Error zooming to feature:', error);
          });
      }
    }
  };

  const handleRefresh = () => {
    refresh();
    clearHighlight();
  };

  const handleDetailPanelClose = () => {
    setDetailPanelOpen(false);
    setSelectedObjectId(null);
    clearHighlight();
  };

  const handleObjectEdit = (object: UrbanObject) => {
    setEditingObjectId(object.id);
    setDetailPanelOpen(false);
    setEditPanelOpen(true);

    setTimeout(() => {
      const graphics = getAllGraphicsById(object.id);

      if (graphics.length > 0) {
        graphics.forEach((g, i) => {
        });

        sketchEditor.startEditing(graphics, object.id);
      } else {
        console.warn(`⚠️ No graphics found for object: ${object.id}`);
      }
    }, 100);
  };

  const handleObjectDelete = (objectId: string) => {
    removeObject(objectId);

    setDetailPanelOpen(false);
    setSelectedObjectId(null);
  };

  const handleEditPanelClose = () => {
    setEditPanelOpen(false);
    setEditingObjectId(null);
    setCurrentTransform(null);

    sketchEditor.stopEditing();

    clearHighlight();
  };

  const handleEditSave = (object: UrbanObject) => {
    setEditPanelOpen(false);
    setEditingObjectId(null);
    setEditPanelHasChanges(false);
    setPendingObjectId(null);
    setCurrentTransform(null);

    sketchEditor.stopEditing();

    setTimeout(() => {
      refresh();

      setTimeout(() => {
        highlight(object.id);

        if (viewRef.current) {
          const objectFromList = urbanObjects.find(obj => obj.id === object.id);

          if (objectFromList?.currentLod?.geom) {
            const zoomTarget = calculateZoomTarget(objectFromList);

            if (zoomTarget) {
              viewRef.current.goTo(zoomTarget, {
                duration: 1500,
                easing: 'ease-in-out',
              }).catch((err) => {
                console.warn('Error zooming to saved object:', err);
              });
            }
          }
        }
      }, 500);
    }, 100);
  };

  const handleAddObject = () => {
    setEditingObjectId(null);
    setDetailPanelOpen(false);
    setEditPanelOpen(true);
    setEditPanelHasChanges(false);
  };

  const handleConfirmSwitchObject = () => {
    if (pendingObjectId) {
      setEditPanelOpen(false);
      setEditingObjectId(null);
      setEditPanelHasChanges(false);

      sketchEditor.stopEditing();

      setTimeout(() => {
        setSelectedObjectId(pendingObjectId);
        setDetailPanelOpen(true);
        highlight(pendingObjectId);
      }, 100);
    }
    setShowConfirmDialog(false);
    setPendingObjectId(null);
  };

  const handleCancelSwitchObject = () => {
    setShowConfirmDialog(false);
    setPendingObjectId(null);
  };

  useEffect(() => {
    return () => {
      if (viewRef.current) {
        viewRef.current = null;
      }
    };
  }, []);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer onViewReady={handleViewReady} onViewCreated={handleViewCreated} />

      {/* Top Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
        }}
      >
        <Tooltip title="Tìm kiếm">
          <IconButton
            ref={searchButtonRef}
            onClick={handleSearchClick}
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Layers">
          <IconButton
            ref={layerButtonRef}
            onClick={handleLayerClick}
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <LayersIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Thời gian">
          <IconButton
            ref={environmentButtonRef}
            onClick={() => setEnvironmentPanelOpen(!environmentPanelOpen)}
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <TimeIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Refresh Data">
          <IconButton
            onClick={handleRefresh}
            disabled={isLoading}
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        {userCanAdd && (
          <Tooltip title="Thêm đối tượng mới">
            <IconButton
              onClick={handleAddObject}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                boxShadow: 2,
                '&:hover': { bgcolor: 'primary.dark' },
                ml: 'auto',
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <AltitudeLodBox altitude={altitude} lod={lod} isMobile={isMobile} />

      <SearchPanel
        open={searchPanelOpen}
        onClose={handleSearchClose}
        anchorEl={searchAnchorEl}
        onFeatureSelect={handleFeatureSelect}
      />

      <LayerPanel open={layerPanelOpen} onClose={handleLayerClose} anchorEl={layerAnchorEl} />

      <ObjectDetailPanel
        open={detailPanelOpen}
        onClose={handleDetailPanelClose}
        objectId={selectedObjectId}
        urbanObjects={urbanObjects}
        onEdit={handleObjectEdit}
        onDelete={handleObjectDelete}
      />

      <ObjectEditPanel
        open={editPanelOpen}
        onClose={handleEditPanelClose}
        objectId={editingObjectId}
        editingObject={editingObjectId ? urbanObjects.find((obj) => obj.id === editingObjectId) : undefined}
        onSave={handleEditSave}
        onDirtyStateChange={setEditPanelHasChanges}
        currentLodLevel={currentLodLevel}
        externalTransform={currentTransform}
        sceneView={sceneView}
      />

      {/* Confirmation Dialog for switching objects while editing or adding */}
      <Dialog open={showConfirmDialog} onClose={handleCancelSwitchObject} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Mở chi tiết đối tượng khác?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn đang trong chế độ chỉnh sửa/thêm đối tượng. Bạn có muốn đóng panel này và mở panel
            chi tiết cho đối tượng khác không?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCancelSwitchObject}
            sx={{ textTransform: 'none' }}
          >
            Tiếp tục chỉnh sửa
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmSwitchObject}
            sx={{ textTransform: 'none' }}
          >
            Mở chi tiết
          </Button>
        </DialogActions>
      </Dialog>

      <EnvironmentSettings
        open={environmentPanelOpen}
        onClose={() => setEnvironmentPanelOpen(false)}
        anchorEl={environmentButtonRef.current}
        view={sceneView}
      />
    </Box>
  );
};
