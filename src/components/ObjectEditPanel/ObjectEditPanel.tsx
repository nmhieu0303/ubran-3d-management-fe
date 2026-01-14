import {
  Add as AddIcon,
  Close as CloseIcon,
  Draw as DrawIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Switch,
  TextareaAutosize,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Point from '@arcgis/core/geometry/Point';
import React, { useEffect, useState, useRef } from 'react';
import SceneView from '@arcgis/core/views/SceneView';
import toast from 'react-hot-toast';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useLodPreview } from '../../hooks/useLodPreview';
import { useObjectTypes } from '../../hooks/useObjectTypes';
import { urbanObjectApiService } from '../../services/urbanObjectApiService';
import type { CreateUrbanObjectRequest, UpdateUrbanObjectRequest } from '../../types/urbanObject.api.types';
import { useAuthStore } from '../../store/authStore';
import type { UrbanObject, UrbanObjectLod } from '../../types/feature.types';
import {
  formatMultiPolygonWithHeights,
  parseMultiPolygonWithHeights,
  validateMultiPolygonInput,
} from '../../utils/lodHeightsParser';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PolygonDrawerModal } from '../map/PolygonDrawerModal';
import { Upload3DModelDialog } from '../Upload3DModelDialog';

interface ObjectEditPanelProps {
  open: boolean;
  onClose: () => void;
  objectId: string | null;
  editingObject?: UrbanObject | null;
  onSave?: (object: UrbanObject) => void;
  onDelete?: (objectId: string) => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
  currentLodLevel?: 0 | 1 | 2 | 3;
  externalTransform?: Partial<{
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    lodLevel?: number;
  }> | null;
  sceneView?: SceneView;
}

interface PropertyField {
  key: string;
  value: string;
}

export const ObjectEditPanel: React.FC<ObjectEditPanelProps> = ({
  open,
  onClose,
  objectId,
  editingObject,
  onSave,
  onDelete,
  onDirtyStateChange,
  currentLodLevel,
  externalTransform,
  sceneView,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuthStore();
  const { data: objectTypes = [], loading: typesLoading } = useObjectTypes();

  useEffect(() => {
  }, [currentLodLevel]);

  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    newObjectId: null as string | null,
  });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('');
  const [area, setArea] = useState('');
  const [height, setHeight] = useState('');
  const [propertyFields, setPropertyFields] = useState<PropertyField[]>([]);

  const [lodData, setLodData] = useState<{
    [key: number]: {
      type: string;
      coordinates: string;
      enabled: boolean;
      area?: number;
      perimeter?: number;
      heights?: number[];
    };
  }>({
    0: { type: 'Point', coordinates: '', enabled: true },
    1: { type: 'Point', coordinates: '', enabled: false },
    2: { type: 'Point', coordinates: '', enabled: false },
    3: { type: 'Point', coordinates: '', enabled: false },
  });

  const [collapsedLods, setCollapsedLods] = useState<{ [key: number]: boolean }>({
    0: false,
    1: true,
    2: true,
    3: true,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentDrawingLod, setCurrentDrawingLod] = useState<number | null>(null);
  const [anchorPointLod3, setAnchorPointLod3] = useState<Point | null>(null);

  const [position, setPosition] = useState({ x: '0', y: '0', z: '0' });
  const [rotation, setRotation] = useState({ x: '0', y: '0', z: '0' });
  const [scale, setScale] = useState({ x: '1', y: '1', z: '1' });

  const [modelFile, setModelFile] = useState<File | null>(null);
  const [existingModelAsset, setExistingModelAsset] = useState<{
    id: string;
    fileName: string;
    fileUrl: string;
  } | null>(null);
  const [isModelAssetDeleted, setIsModelAssetDeleted] = useState(false);

  const [originalState, setOriginalState] = useState<any>(null);

  const model3DUpload = useFileUpload({
    onUpload: async (file) => {
      const validFormats = ['.glb', '.gltf'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validFormats.includes(fileExtension)) {
        toast.error('Định dạng file không hợp lệ. Chỉ hỗ trợ .glb và .gltf');
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Kích thước file vượt quá 50MB');
        return;
      }

      setModelFile(file);
      setIsDirty(true);
      toast.success(`Đã chọn file: ${file.name}`);
    },
  });

  const handleTransformUpdate = (transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }) => {
    setPosition({
      x: String(transform.position.x),
      y: String(transform.position.y),
      z: String(transform.position.z),
    });
    setRotation({
      x: String(transform.rotation.x),
      y: String(transform.rotation.y),
      z: String(transform.rotation.z),
    });
    setScale({
      x: String(transform.scale.x),
      y: String(transform.scale.y),
      z: String(transform.scale.z),
    });
  };

  const {
    isPreviewMode,
    previewLodLevel,
    transformEnabled,
    startPreview,
    cancelPreview,
    enableTransform,
    disableTransform,
  } = useLodPreview({
    view: sceneView,
    onTransform: handleTransformUpdate,
  });

  const prevPreviewCoordinatesRef = useRef<string | null>(null);

  const prevModelPreviewRef = useRef<{
    modelFileName: string | null;
    anchorPoint: string | null;
  }>({ modelFileName: null, anchorPoint: null });

  const isLodBasedObject = (): boolean => {
    const hasModelTransform =
      position.x !== '0' ||
      position.y !== '0' ||
      position.z !== '0' ||
      rotation.x !== '0' ||
      rotation.y !== '0' ||
      rotation.z !== '0' ||
      scale.x !== '1' ||
      scale.y !== '1' ||
      scale.z !== '1';

    if (hasModelTransform || modelFile) {
      return false;
    }

    return Object.values(lodData).some(
      (lod) => lod.enabled && lod.coordinates && lod.coordinates.trim() !== ''
    );
  };

  useEffect(() => {
    if (!open) {
      resetForm();
      setIsDirty(false);
      return;
    }

    if (!objectId) {
      resetForm();
      setIsDirty(false);
      return;
    }

    const loadObjectData = async () => {
      setIsLoading(true);
      try {

        const apiResponse = await urbanObjectApiService.getById(objectId);

        const data = apiResponse?.data || apiResponse;

        if (data) {

          setName(data.name || '');
          setCode(data.code || '');
          setType(data.type || data.type_id || data.typeId || '');

          setArea(data?.area?.toString() || '');

          setHeight(data?.height?.toString() || '');

          if (data.modelAsset) {
            setExistingModelAsset({
              id: data.modelAsset.id,
              fileName: data.modelAsset.fileName || data.modelAsset.file_name || 'model.glb',
              fileUrl: data.modelAsset.fileUrl || data.modelAsset.file_url || '',
            });
          }

          if (data.properties) {
            const customProps: PropertyField[] = [];

            Object.entries(data.properties).forEach(([key, value]) => {
              if (!['area', 'height'].includes(key)) {
                customProps.push({ key, value: String(value ?? '') });
              }
            });

            setPropertyFields(customProps);
          } else {
            setPropertyFields([]);
          }

          if (data.modelTransform || data.modelTransform) {
            const transform = data.modelTransform || data.modelTransform;

            if (transform.position) {
              const pos = Array.isArray(transform.position)
                ? { x: transform.position[0], y: transform.position[1], z: transform.position[2] }
                : transform.position;
              setPosition({
                x: pos?.x?.toString?.() || '0',
                y: pos?.y?.toString?.() || '0',
                z: pos?.z?.toString?.() || '0',
              });
            }
            if (transform.rotation) {
              const rot = Array.isArray(transform.rotation)
                ? { x: transform.rotation[0], y: transform.rotation[1], z: transform.rotation[2] }
                : transform.rotation;
              setRotation({
                x: rot?.x?.toString?.() || '0',
                y: rot?.y?.toString?.() || '0',
                z: rot?.z?.toString?.() || '0',
              });
            }
            if (transform.scale) {
              const scl = Array.isArray(transform.scale)
                ? { x: transform.scale[0], y: transform.scale[1], z: transform.scale[2] }
                : transform.scale;
              setScale({
                x: scl?.x?.toString?.() || '1',
                y: scl?.y?.toString?.() || '1',
                z: scl?.z?.toString?.() || '1',
              });
            }
          }

          if (data.lods && Array.isArray(data.lods)) {
            const newLodData: any = {
              0: { type: 'Point', coordinates: '', enabled: false },
              1: { type: 'Point', coordinates: '', enabled: false },
              2: { type: 'Point', coordinates: '', enabled: false },
              3: { type: 'Point', coordinates: '', enabled: false },
            };
            data.lods.forEach((lod: any) => {
              const lodLevel = lod.lodLevel ?? lod.lod_level;
              const lodGeometryType = lod.geom?.type ?? lod.geometryType;

              const geomObject = lod.geom || lod.geometry;

              if (!geomObject || !geomObject.coordinates) {
                newLodData[lodLevel] = {
                  type: lodGeometryType || 'Point',
                  coordinates: '',
                  area: lod.area,
                  perimeter: lod.perimeter,
                  heights: lod.heights,
                  enabled: false,
                };
                return;
              }

              let formattedCoordinates = '';
              let extractedHeights = lod.heights;
              try {
                if (lodGeometryType === 'MultiPolygon') {
                  if (lod.heights && Array.isArray(lod.heights)) {
                    formattedCoordinates = formatMultiPolygonWithHeights(
                      geomObject.coordinates,
                      lod.heights
                    );
                  } else {
                    const multiPolygonCoords = geomObject.coordinates as number[][][][];
                    const defaultHeights = multiPolygonCoords.map(() => 20);
                    formattedCoordinates = formatMultiPolygonWithHeights(
                      geomObject.coordinates,
                      defaultHeights
                    );
                    extractedHeights = defaultHeights;
                    console.warn(`⚠️  No heights array for MultiPolygon LOD${lodLevel} of ${data.name}, created default heights:`, defaultHeights);
                  }
                } else {
                  formattedCoordinates = JSON.stringify(geomObject.coordinates);
                }
              } catch (err) {
                console.error(`Error formatting coordinates for LOD ${lodLevel}:`, err);
                formattedCoordinates = '';
              }

              newLodData[lodLevel] = {
                type: lodGeometryType,
                coordinates: formattedCoordinates,
                area: lod.area,
                perimeter: lod.perimeter,
                heights: extractedHeights,
                enabled: true,
              };
            });
            setLodData(newLodData);
          }

          const originalStateData = {
            name: data.name || '',
            code: data.code || '',
            type: data.type || data.type_id || '',
            area: ((data?.area) || '')?.toString?.() || '',
            height: ((data?.height) || '')?.toString?.() || '',
          };
          setOriginalState(originalStateData);
        }
      } catch (error) {
        console.error('Error loading object:', error);
        toast.error('Không thể tải dữ liệu đối tượng. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    };

    loadObjectData();
  }, [open, objectId]);

  useEffect(() => {
    if (!externalTransform) {
      return;
    }


    const is3DModel = !isLodBasedObject();

    if (is3DModel) {

      if (externalTransform.position) {
        setPosition({
          x: String(externalTransform.position.x),
          y: String(externalTransform.position.y),
          z: String(externalTransform.position.z),
        });
      }

      if (externalTransform.rotation) {
        setRotation({
          x: String(externalTransform.rotation.x),
          y: String(externalTransform.rotation.y),
          z: String(externalTransform.rotation.z),
        });
      }

      if (externalTransform.scale) {
        setScale({
          x: String(externalTransform.scale.x),
          y: String(externalTransform.scale.y),
          z: String(externalTransform.scale.z),
        });
      }
    } else {

      if (externalTransform.position || externalTransform.rotation || externalTransform.scale) {
        const updatedLodData = { ...lodData };
        let hasChanges = false;

        let targetLodLevel: number | null = null;
        if (externalTransform.lodLevel !== undefined) {
          targetLodLevel = externalTransform.lodLevel;
        } else if (currentLodLevel !== undefined) {
          targetLodLevel = currentLodLevel;
        } else {
          for (let level = 3; level >= 0; level--) {
            const lod = lodData[level];
            if (lod.enabled && lod.coordinates && lod.coordinates.trim() !== '') {
              targetLodLevel = level;
              break;
            }
          }
        }

        if (targetLodLevel === null) {
          return;
        }

        const level = targetLodLevel;
        const lod = lodData[level];

        if (lod.enabled && lod.coordinates && lod.coordinates.trim() !== '') {
          try {
            let coords;
            let extractedHeights = lod.heights;

            if (lod.type === 'MultiPolygon') {
              const parsed = parseMultiPolygonWithHeights(lod.coordinates);
              if (parsed) {
                coords = parsed.coordinates;
                if (!extractedHeights && parsed.heights) {
                  extractedHeights = parsed.heights;
                }
              } else {
                coords = JSON.parse(lod.coordinates);
              }
            } else {
              coords = JSON.parse(lod.coordinates);
            }

            let transformedCoords = coords;
            let transformedHeights = extractedHeights;

            if (
              externalTransform.position &&
              (externalTransform.position.x !== 0 || externalTransform.position.y !== 0)
            ) {
              const dx = externalTransform.position.x;
              const dy = externalTransform.position.y;

              if (lod.type === 'Point') {
                transformedCoords = [coords[0] + dx, coords[1] + dy, coords[2] || 0];
              } else if (lod.type === 'Polygon') {
                transformedCoords = coords.map((ring: number[][]) =>
                  ring.map((point: number[]) => [point[0] + dx, point[1] + dy, point[2] || 0])
                );
              } else if (lod.type === 'MultiPolygon') {
                transformedCoords = coords.map((polygon: number[][][]) =>
                  polygon.map((ring: number[][]) =>
                    ring.map((point: number[]) => [point[0] + dx, point[1] + dy, point[2] || 0])
                  )
                );
              }
            }

            if (externalTransform.scale && lod.type === 'MultiPolygon' && transformedHeights) {
              const scaleZ = externalTransform.scale.z;
              if (scaleZ !== 1) {
                transformedHeights = transformedHeights.map((h) => h * scaleZ);
              }
            }

            if (lod.type === 'MultiPolygon' && transformedHeights) {
              updatedLodData[level] = {
                ...lod,
                coordinates: formatMultiPolygonWithHeights(transformedCoords, transformedHeights),
                heights: transformedHeights,
              };
            } else {
              updatedLodData[level] = {
                ...lod,
                coordinates: JSON.stringify(transformedCoords),
              };
            }

            hasChanges = true;
          } catch (error) {
            console.error(`Error applying transform to LOD ${level}:`, error);
          }
        }

        if (hasChanges) {
          setLodData(updatedLodData);
        }
      }
    }

    setIsDirty(true);

  }, [externalTransform, objectId]);

  const resetForm = () => {
    if (isPreviewMode) {
      cancelPreview();
    }

    setName('');
    setCode('');
    setType('');
    setArea('');
    setHeight('');
    setPropertyFields([]);
    setPosition({ x: '0', y: '0', z: '0' });
    setRotation({ x: '0', y: '0', z: '0' });
    setScale({ x: '1', y: '1', z: '1' });
    setLodData({
      0: { type: 'Point', coordinates: '', enabled: true },
      1: { type: 'Point', coordinates: '', enabled: false },
      2: { type: 'Point', coordinates: '', enabled: false },
      3: { type: 'Point', coordinates: '', enabled: false },
    });
    setModelFile(null);
    setExistingModelAsset(null);
    setIsModelAssetDeleted(false);
    setOriginalState(null);
    setIsDirty(false);
    setCollapsedLods({
      0: false,
      1: true,
      2: true,
      3: true,
    });
    setAnchorPointLod3(null);
    if (onDirtyStateChange) {
      onDirtyStateChange(false);
    }
  };

  const checkIsDirty = () => {
    if (!objectId) return false;
    if (!originalState) {
      return false;
    }
    const isDirty = (
      name !== originalState.name ||
      code !== originalState.code ||
      type !== originalState.type ||
      area !== originalState.area ||
      height !== originalState.height
    );
    return isDirty;
  };

  useEffect(() => {
    const isDirtyNow = checkIsDirty();
    setIsDirty(isDirtyNow);
    if (onDirtyStateChange) {
      onDirtyStateChange(isDirtyNow);
    }
  }, [
    name,
    code,
    type,
    area,
    height,
    objectId,
    originalState,
    onDirtyStateChange,
    propertyFields,
    lodData,
  ]);

  useEffect(() => {
    if (isPreviewMode && previewLodLevel === 3 && modelFile && anchorPointLod3) {
      const currentModelFileName = modelFile.name;
      const currentAnchorPoint = `${anchorPointLod3.x},${anchorPointLod3.y},${anchorPointLod3.z || 0}`;

      if (
        prevModelPreviewRef.current.modelFileName === currentModelFileName &&
        prevModelPreviewRef.current.anchorPoint === currentAnchorPoint
      ) {
        return;
      }

      prevModelPreviewRef.current = {
        modelFileName: currentModelFileName,
        anchorPoint: currentAnchorPoint,
      };

      const previewGeometry = {
        type: 'Point' as const,
        coordinates: [anchorPointLod3.x, anchorPointLod3.y, anchorPointLod3.z || 0],
        modelFile: modelFile,
        anchorPoint: anchorPointLod3,
      };
      startPreview(3, previewGeometry);
    } else {
      prevModelPreviewRef.current = { modelFileName: null, anchorPoint: null };
    }
  }, [modelFile, isPreviewMode, previewLodLevel, anchorPointLod3, startPreview]);

  useEffect(() => {
    if (isPreviewMode && previewLodLevel !== null && sceneView) {
      const level = previewLodLevel;
      const lod = lodData[level];

      if (level === 3 && modelFile && anchorPointLod3) {
        return;
      }

      if (!lod.enabled || !lod.coordinates || lod.coordinates.trim() === '') {
        return;
      }

      const coordinatesKey = `${level}-${lod.coordinates}-${lod.heights?.[0]}`;
      if (prevPreviewCoordinatesRef.current === coordinatesKey) {
        return;
      }

      try {
        const geometryType = lod.type as 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
        let coordinates: any;
        let heights: number[] | undefined;

        if (geometryType === 'MultiPolygon') {
          const parsed = parseMultiPolygonWithHeights(lod.coordinates);
          if (parsed) {
            coordinates = parsed.coordinates;
            heights = parsed.heights;
          } else {
            coordinates = JSON.parse(lod.coordinates);
            heights = lod.heights;
          }
        } else {
          coordinates = JSON.parse(lod.coordinates);
          heights = lod.heights;
        }

        const previewGeometry = {
          type: geometryType,
          coordinates: coordinates,
          height: heights?.[0],
          heights: heights,
        };

        prevPreviewCoordinatesRef.current = coordinatesKey;

        startPreview(level, previewGeometry);
      } catch (error) {
      }
    } else {
      prevPreviewCoordinatesRef.current = null;
    }
  }, [lodData, isPreviewMode, previewLodLevel, sceneView, startPreview, modelFile, anchorPointLod3]);

  useEffect(() => {
    const lod3 = lodData[3];

    if (!lod3.enabled || !lod3.coordinates || lod3.coordinates.trim() === '') {
      return;
    }

    try {
      const coordinates = JSON.parse(lod3.coordinates);
      const geometryType = lod3.type;

      let newAnchorPoint: Point | null = null;

      if (geometryType === 'Point') {
        const coords = Array.isArray(coordinates[0]) ? coordinates[0] : coordinates;
        newAnchorPoint = new Point({
          x: coords[0],
          y: coords[1],
          z: coords[2] || 0,
          spatialReference: { wkid: 4326 },
        });
      } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        let firstRing: number[][] = [];

        if (geometryType === 'Polygon') {
          firstRing = coordinates[0] || [];
        } else {
          firstRing = coordinates[0]?.[0] || [];
        }

        if (firstRing.length > 0) {
          let sumX = 0, sumY = 0, sumZ = 0;
          firstRing.forEach((point: number[]) => {
            sumX += point[0];
            sumY += point[1];
            sumZ += point[2] || 0;
          });

          newAnchorPoint = new Point({
            x: sumX / firstRing.length,
            y: sumY / firstRing.length,
            z: sumZ / firstRing.length,
            spatialReference: { wkid: 4326 },
          });
        }
      }

      if (newAnchorPoint) {
        setAnchorPointLod3(newAnchorPoint);
      }
    } catch (error) {
    }
  }, [lodData[3].coordinates, lodData[3].type, lodData[3].enabled]);

  const handleAddProperty = () => {
    setPropertyFields([...propertyFields, { key: '', value: '' }]);
  };

  const handleRemoveProperty = (index: number) => {
    setPropertyFields(propertyFields.filter((_, i) => i !== index));
  };

  const handlePropertyChange = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...propertyFields];
    newFields[index][field] = value;
    setPropertyFields(newFields);
  };

  const handleModelFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setModelFile(event.target.files[0]);
      setIsDirty(true);
    }
  };

  const handleLodToggle = (level: number) => {
    setLodData({
      ...lodData,
      [level]: { ...lodData[level], enabled: !lodData[level].enabled },
    });
    setIsDirty(true);
  };

  const handleToggleLodCollapse = (level: number) => {
    setCollapsedLods({
      ...collapsedLods,
      [level]: !collapsedLods[level],
    });
  };


  const handleOpenDrawer = (level: number) => {
    setCurrentDrawingLod(level);
    if (level === 3) {
      setAnchorPointLod3(null);
    }
    setDrawerOpen(true);
  };

  const handleLodPreview = (level: number) => {
    if (isPreviewMode && previewLodLevel === level) {
      cancelPreview();
    } else {
      const coordinatesStr = lodData[level].coordinates;

      if (level === 3 && modelFile && anchorPointLod3) {
        const previewGeometry = {
          type: 'Point' as const,
          coordinates: [anchorPointLod3.x, anchorPointLod3.y, anchorPointLod3.z || 0],
          modelFile: modelFile,
          anchorPoint: anchorPointLod3,
        };
        startPreview(level, previewGeometry);
        return;
      }

      if (!coordinatesStr) {
        return;
      }

      try {
        const geometryType = lodData[level].type as 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
        let coordinates: any;
        let heights: number[] | undefined;

        if (geometryType === 'MultiPolygon') {
          const parsed = parseMultiPolygonWithHeights(coordinatesStr);
          if (parsed) {
            coordinates = parsed.coordinates;
            heights = parsed.heights;
          } else {
            throw new Error('Failed to parse MultiPolygon');
          }
        } else {
          coordinates = JSON.parse(coordinatesStr);
          heights = lodData[level].heights;
        }

        const previewGeometry = {
          type: geometryType,
          coordinates: coordinates,
          height: heights?.[0],
          heights: heights
        };

        startPreview(level, previewGeometry);
      } catch (error) {
        console.error('Error parsing geometry for preview:', error);
      }
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setCurrentDrawingLod(null);
  };


  const processLodData = (): Array<
    Omit<UrbanObjectLod, 'id' | 'urbanObjectId' | 'createdAt' | 'updatedAt'>
  > => {
    const lods: Array<
      Omit<UrbanObjectLod, 'id' | 'urbanObjectId' | 'createdAt' | 'updatedAt'>
    > = [];

    [0, 1, 2, 3].forEach((level) => {
      const lodInfo = lodData[level];
      if (!lodInfo.enabled || !lodInfo.coordinates || lodInfo.coordinates.trim() === '') {
        return;
      }

      try {
        if (lodInfo.type === 'MultiPolygon') {
          const validation = validateMultiPolygonInput(lodInfo.coordinates);
          if (validation.valid) {
            const parsed = parseMultiPolygonWithHeights(lodInfo.coordinates);
            if (parsed) {
              console.log(`🔍 ObjectEditPanel processLodData MultiPolygon LOD${level}:`, {
                input: lodInfo.coordinates,
                parsed: {
                  coordCount: parsed.coordinates.length,
                  heights: parsed.heights,
                  zValues: parsed.coordinates.map(poly => poly[0]?.[0]?.[2] ?? 'undefined'),
                }
              });
              lods.push({
                lodLevel: level as 0 | 1 | 2 | 3,
                geometryType: 'MultiPolygon',
                geom: {
                  type: 'MultiPolygon',
                  coordinates: parsed.coordinates,
                },
                heights: parsed.heights,
              });
              return;
            }
          }
        }

        const coordinates = JSON.parse(lodInfo.coordinates);
        lods.push({
          lodLevel: level as 0 | 1 | 2 | 3,
          geometryType: lodInfo.type as 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon',
          geom: {
            type: lodInfo.type,
            coordinates,
          },
        });
      } catch (error) {
        console.error(`Error parsing LOD ${level} coordinates:`, error);
        alert(
          `Lỗi dữ liệu LOD ${level}: ${error instanceof Error ? error.message : 'Invalid format'}`
        );
      }
    });

    return lods;
  };

  const handleSaveDrawnPolygon = (
    coordinates:
      | number[][][]
      | number[][][][]
      | Array<{ coordinates: number[][][]; height: number }>,
    area: number,
    perimeter: number,
    geometryType: string
  ) => {
    if (currentDrawingLod === null) return;

    let coordinatesStr = '';
    let heights: number[] | undefined = undefined;

    if (geometryType === 'MultiPolygon' && Array.isArray(coordinates) && coordinates[0] && typeof coordinates[0] === 'object' && 'coordinates' in coordinates[0]) {
      const blocks = coordinates as Array<{ coordinates: number[][][]; height: number }>;
      coordinatesStr = JSON.stringify(blocks);
      heights = blocks.map(b => b.height);
    } else {
      coordinatesStr = JSON.stringify(coordinates);
    }

    setLodData({
      ...lodData,
      [currentDrawingLod]: {
        ...lodData[currentDrawingLod],
        type: geometryType,
        coordinates: coordinatesStr,
        area,
        perimeter,
        heights: heights,
      },
    });
    setIsDirty(true);
    handleCloseDrawer();
  };

  const handleRequestClose = () => {
    if (isPreviewMode) {
      cancelPreview();
    }

    if (isDirty) {
      setConfirmDialog({ open: true, newObjectId: null });
    } else {
      resetForm();
      onClose();
    }
  };

  const handleConfirmClose = async () => {
    if (isPreviewMode) {
      cancelPreview();
    }

    setConfirmDialog({ open: false, newObjectId: null });
    resetForm();
    onClose();
  };

  const handleCancelClose = () => {
    setConfirmDialog({ open: false, newObjectId: null });
  };

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!objectId) return;

    setIsDeleting(true);
    try {
      await urbanObjectApiService.delete(objectId);
      toast.success('Xóa đối tượng thành công');

      if (onDelete) {
        onDelete(objectId);
      }

      resetForm();
      setDeleteDialog(false);
      onClose();
    } catch (error: any) {
      console.error('Error deleting object:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Không thể xóa đối tượng. Vui lòng thử lại.';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!name || !code || !type) {
      toast.error('Vui lòng nhập các trường bắt buộc: Tên, Mã, Loại');
      return;
    }

    if (isPreviewMode) {
      cancelPreview();
    }

    const processedLods = processLodData();
    if (processedLods.length === 0) {
      toast.error('Vui lòng thêm ít nhất một LOD (Level of Detail)');
      return;
    }

    setIsSaving(true);
    try {
      const properties: Record<string, any> = {};
      if (area) properties.area = parseFloat(area);
      if (height) properties.height = parseFloat(height);
      propertyFields.forEach((field) => {
        if (field.key && field.value) {
          properties[field.key] = field.value;
        }
      });

      const apiLods = processedLods.map(lod => {
        const lodObj: any = {
          lodLevel: lod.lodLevel,
          enabled: true,
          geom: lod.geom,
          heights: lod.heights,
          modelTransform: undefined,
        };

        if (lod.lodLevel === 3 && isModelAssetDeleted && !modelFile) {
          lodObj.deleteModelAsset = true;
        }

        return lodObj;
      });

      let result: any;

      if (objectId) {
        const updateData: UpdateUrbanObjectRequest = {
          name,
          type: type,
          height: height ? parseFloat(height) : undefined,
          area: area ? parseFloat(area) : undefined,
          description: properties.description,
          properties,
          status: 'active',
          lods: apiLods,
        };

        if (!isLodBasedObject()) {
          updateData.modelTransform = {
            position: {
              x: parseFloat(position.x),
              y: parseFloat(position.y),
              z: parseFloat(position.z),
            },
            rotation: {
              x: parseFloat(rotation.x),
              y: parseFloat(rotation.y),
              z: parseFloat(rotation.z),
            },
            scale: {
              x: parseFloat(scale.x),
              y: parseFloat(scale.y),
              z: parseFloat(scale.z),
            },
          };
        }

        if (modelFile) {
          updateData.lod3Model = modelFile;
        }

        result = await urbanObjectApiService.update(objectId, updateData);
        toast.success('Cập nhật đối tượng thành công');
      } else {
        const createData: CreateUrbanObjectRequest = {
          code,
          name,
          type: type,
          height: height ? parseFloat(height) : undefined,
          area: area ? parseFloat(area) : undefined,
          description: properties.description,
          properties,
          status: 'active',
          lods: apiLods,
        };

        if (!isLodBasedObject()) {
          createData.modelTransform = {
            position: {
              x: parseFloat(position.x),
              y: parseFloat(position.y),
              z: parseFloat(position.z),
            },
            rotation: {
              x: parseFloat(rotation.x),
              y: parseFloat(rotation.y),
              z: parseFloat(rotation.z),
            },
            scale: {
              x: parseFloat(scale.x),
              y: parseFloat(scale.y),
              z: parseFloat(scale.z),
            },
          };
        }

        if (modelFile) {
          createData.lod3Model = modelFile;
        }

        result = await urbanObjectApiService.create(createData);
        toast.success('Tạo đối tượng mới thành công');
      }

      if (onSave) {
        onSave(result as any);
      }

      resetForm();
      setIsDirty(false);
      onClose();
    } catch (error: any) {
      console.error('Error saving object:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Lưu thất bại. Vui lòng thử lại.';
      toast.error(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Collapsed Panel */}
      {open && isCollapsed && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            zIndex: 1200,
            bgcolor: 'background.paper',
            borderLeft: 1,
            borderColor: 'divider',
            boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            height: 200,
            borderRadius: '8px 0 0 8px',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              mb: 1,
            }}
          >
            {objectId ? 'Chỉnh sửa' : 'Thêm mới'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <IconButton onClick={() => setIsCollapsed(false)} size="small">
              <ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Side Drawer */}
      <Drawer
        anchor="right"
        open={open && !isCollapsed}
        onClose={handleRequestClose}
        variant="temporary"
        hideBackdrop={true}
        ModalProps={{
          disableEnforceFocus: true,
          disableAutoFocus: true,
          disableRestoreFocus: true,
          style: { pointerEvents: 'none' },
        }}
        PaperProps={{
          sx: { pointerEvents: 'auto' },
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: isMobile ? '100%' : 400,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {objectId ? `Chỉnh sửa: ${name || code}` : 'Thêm đối tượng mới'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton onClick={() => setIsCollapsed(true)} size="small">
                <ExpandMoreIcon />
              </IconButton>
              <IconButton onClick={handleRequestClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Basic Information */}
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Thông tin cơ bản
                </Typography>

                <TextField
                  fullWidth
                  label="Tên *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Toà nhà A-123"
                  sx={{ mb: 2 }}
                />

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Mã *"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="BLD-001"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="Loại *"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      disabled={typesLoading}
                    >
                      {objectTypes.map((typeOption) => (
                        <MenuItem key={typeOption.value} value={typeOption.value}>
                          {typeOption.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Diện tích *"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="Nhập diện tích"
                      type="number"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Chiều cao *"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="Nhập chiều cao"
                      type="number"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Properties Section */}
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Properties
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddProperty}
                      size="small"
                      sx={{ textTransform: 'none' }}
                    >
                      Thêm
                    </Button>
                  </Box>

                  {propertyFields.map((field, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        size="small"
                        placeholder="Năm Xây Dựng"
                        value={field.key}
                        onChange={(e) => handlePropertyChange(index, 'key', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        placeholder="2015"
                        value={field.value}
                        onChange={(e) => handlePropertyChange(index, 'value', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveProperty(index)}
                        sx={{ alignSelf: 'center' }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* LOD Section */}
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  MỨC ĐỘ CHI TIẾT*
                </Typography>

                {[0, 1, 2, 3].map((level) => (
                  <Box
                    key={level}
                    sx={{
                      mb: 2,
                      border: `1px solid ${lodData[level].enabled ? '#E5E7EB' : '#F3F4F6'}`,
                      borderRadius: 1,
                      p: 1.5,
                      bgcolor: lodData[level].enabled ? 'background.paper' : '#FAFBFC',
                      opacity: lodData[level].enabled ? 1 : 0.6,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: lodData[level].enabled && !collapsedLods[level] ? 1.5 : 0,
                      }}
                    >
                      <Chip
                        label={`LOD${level}`}
                        size="small"
                        sx={{
                          bgcolor:
                            level === 0
                              ? '#3B82F6'
                              : level === 1
                              ? '#10B981'
                              : level === 2
                              ? '#F59E0B'
                              : '#EF4444',
                          color: 'white',
                          fontWeight: 600,
                          mr: 1,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Level {level}
                      </Typography>
                      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Preview Icon Button */}
                        <Tooltip
                          title={
                            !(lodData[level].coordinates || (level === 3 && modelFile && anchorPointLod3))
                              ? 'Add geometry or model to preview'
                              : isPreviewMode && previewLodLevel === level
                              ? 'Hide preview'
                              : 'Preview on map'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleLodPreview(level)}
                              disabled={!(lodData[level].coordinates || (level === 3 && modelFile && anchorPointLod3))}
                              sx={{
                                color: isPreviewMode && previewLodLevel === level ? 'success.main' : 'action.active',
                              }}
                            >
                              {isPreviewMode && previewLodLevel === level ? (
                                <Badge variant="dot" color="success">
                                  <VisibilityIcon fontSize="small" />
                                </Badge>
                              ) : (
                                <VisibilityIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Switch
                          size="small"
                          checked={lodData[level].enabled}
                          onChange={() => handleLodToggle(level)}
                        />
                        {lodData[level].enabled && (
                          <IconButton
                            size="small"
                            onClick={() => handleToggleLodCollapse(level)}
                            sx={{
                              transform: collapsedLods[level] ? 'rotate(0deg)' : 'rotate(180deg)',
                              transition: 'transform 0.2s',
                            }}
                          >
                            <ExpandMoreIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                    {lodData[level].enabled && !collapsedLods[level] && (
                      <Box sx={{ mt: 1.5 }}>
                        {/* Geometry Type Selector and Draw Button */}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1.5 }}>
                          <TextField
                            select
                            size="small"
                            label="Geometry Type"
                            value={lodData[level].type}
                            onChange={(e) => {
                              setLodData({
                                ...lodData,
                                [level]: {
                                  ...lodData[level],
                                  type: e.target.value,
                                  coordinates: '',
                                  area: undefined,
                                  perimeter: undefined,
                                },
                              });
                              if (level === 3) {
                                setAnchorPointLod3(null);
                              }
                              setIsDirty(true);
                            }}
                            sx={{ flex: 1 }}
                          >
                            <MenuItem value="Point">Point</MenuItem>
                            <MenuItem value="LineString">LineString</MenuItem>
                            <MenuItem value="Polygon">Polygon</MenuItem>
                            <MenuItem value="MultiPolygon">MultiPolygon (with heights)</MenuItem>
                          </TextField>

                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenDrawer(level)}
                            sx={{ textTransform: 'none', minWidth: 'auto', px: 2 }}
                            startIcon={<DrawIcon />}
                          >
                            Vẽ
                          </Button>
                        </Box>

                        {/* Upload 3D Model - Only show for LOD3 with Point or Polygon */}
                        {level === 3 && (lodData[level].type === 'Point' || lodData[level].type === 'Polygon') && (
                          <Box sx={{ mb: 1.5 }}>
                            {existingModelAsset && !modelFile ? (
                              <Box
                                sx={{
                                  p: 1.5,
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: 1,
                                  border: '1px solid #e0e0e0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                }}
                              >
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                    📦 {existingModelAsset.fileName}
                                  </Typography>
                                </Box>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setExistingModelAsset(null);
                                    setIsModelAssetDeleted(true);
                                    setIsDirty(true);
                                  }}
                                  sx={{ ml: 1 }}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ) : modelFile ? (
                              <Box
                                sx={{
                                  p: 1.5,
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: 1,
                                  border: '1px solid #e0e0e0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                }}
                              >
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                    📦 {modelFile.name}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {(modelFile.size / 1024 / 1024).toFixed(2)} MB
                                  </Typography>
                                </Box>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setModelFile(null);
                                    setIsDirty(true);
                                  }}
                                  sx={{ ml: 1 }}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ) : (
                              <>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  fullWidth
                                  onClick={model3DUpload.openDialog}
                                  sx={{ textTransform: 'none', mb: 1 }}
                                  startIcon={<UploadIcon />}
                                  disabled={!anchorPointLod3}
                                >
                                  {anchorPointLod3
                                    ? 'Tải lên mô hình 3D (GLB/GLTF)'
                                    : 'Vẽ hình trước để lấy anchor point'}
                                </Button>
                                {anchorPointLod3 && (
                                  <Typography variant="caption" sx={{ color: 'success.main', display: 'block' }}>
                                    ✓ Anchor point sẵn sàng: [{anchorPointLod3.longitude?.toFixed(4) ?? '0'}, {anchorPointLod3.latitude?.toFixed(4) ?? '0'}, {anchorPointLod3.z?.toFixed(2) ?? '0'}]
                                  </Typography>
                                )}
                              </>
                            )}
                          </Box>
                        )}


                        {/* Coordinates TextArea */}
                        <Box sx={{ mb: 1 }}>
                          <TextareaAutosize
                            aria-label="empty textarea"
                            minRows={4}
                            style={{
                              width: '100%',
                              maxWidth: '100%',
                              fontSize: '0.875rem',
                              padding: '8.5px 14px',
                              fontFamily: 'monospace',
                              borderRadius: '4px',
                              border: '1px solid #ccc',
                            }}
                            placeholder={(() => {
                              switch (lodData[level].type) {
                                case 'Point':
                                  return '[lon, lat, elevation]';
                                case 'LineString':
                                  return '[[lon, lat, z], [lon, lat, z], ...]';
                                case 'Polygon':
                                  return '[[[lon, lat, z], [lon, lat, z], ..., [lon, lat, z]]]';
                                case 'MultiPolygon':
                                  return '[{"coordinates":[[[lon,lat,z]...]],"height":200}, ...]';
                                default:
                                  return '';
                              }
                            })()}
                            value={lodData[level].coordinates}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setLodData({
                                ...lodData,
                                [level]: { ...lodData[level], coordinates: newValue },
                              });

                              if (level === 3 && !newValue.trim()) {
                                setAnchorPointLod3(null);
                              }

                              setIsDirty(true);
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}

                <Divider sx={{ my: 3 }} />

                {/* Model Transform */}
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Model Transform
                  <Chip label="Auto-synced" size="small" sx={{ ml: 1, fontSize: '0.7rem' }} />
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', mb: 2, fontSize: '0.85rem' }}
                >
                  • Các giá trị này nãy tự động cập nhật khi bạn kéo/xoay/thay đổi tỉ lệ đối tượng
                  trên bản đồ
                </Typography>

                {/* Position */}
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  Position
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="X"
                      value={position.x}
                      onChange={(e) => setPosition({ ...position, x: e.target.value })}
                      type="number"
                      disabled={true}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Y"
                      value={position.y}
                      onChange={(e) => setPosition({ ...position, y: e.target.value })}
                      type="number"
                      disabled={true}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Z"
                      value={position.z}
                      onChange={(e) => setPosition({ ...position, z: e.target.value })}
                      type="number"
                      disabled={true}
                    />
                  </Grid>
                </Grid>

                {/* Rotation */}
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  Rotation (°)
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="X"
                      value={rotation.x}
                      onChange={(e) => setRotation({ ...rotation, x: e.target.value })}
                      type="number"
                      disabled={true}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Y"
                      value={rotation.y}
                      onChange={(e) => setRotation({ ...rotation, y: e.target.value })}
                      type="number"
                      disabled={true}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Z"
                      value={rotation.z}
                      onChange={(e) => setRotation({ ...rotation, z: e.target.value })}
                      type="number"
                      disabled={true}
                    />
                  </Grid>
                </Grid>

                {/* Scale */}
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  Scale
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="X"
                      value={scale.x}
                      onChange={(e) => setScale({ ...scale, x: e.target.value })}
                      type="number"
                      disabled={true}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Y"
                      value={scale.y}
                      onChange={(e) => setScale({ ...scale, y: e.target.value })}
                      type="number"
                      disabled={true}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Z"
                      value={scale.z}
                      onChange={(e) => setScale({ ...scale, z: e.target.value })}
                      type="number"
                      disabled={true}
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.default',
              display: 'flex',
              gap: 1,
            }}
          >
            <Button
              variant="outlined"
              onClick={handleRequestClose}
              fullWidth
              sx={{ textTransform: 'none' }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isSaving || !name || !code || !type}
              fullWidth
              sx={{ textTransform: 'none' }}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={handleCancelClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Huỷ chỉnh sửa?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có những thay đổi chưa được lưu. Bạn có chắc chắn muốn huỷ những thay đổi này?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" onClick={handleCancelClose} sx={{ textTransform: 'none' }}>
            Tiếp tục chỉnh sửa
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmClose}
            sx={{ textTransform: 'none' }}
          >
            Huỷ thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload 3D Model Dialog */}
      <Upload3DModelDialog
        open={model3DUpload.dialogOpen}
        onClose={model3DUpload.closeDialog}
        onUpload={model3DUpload.handleUpload}
        isLoading={model3DUpload.isLoading}
        error={model3DUpload.error}
      />

      {/* Delete Object Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa"
        message="Bạn có chắc muốn xóa đối tượng này? Thao tác này không thể hoàn tác."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        itemName={name || code}
      />

      {/* Polygon Drawer Modal */}
      {currentDrawingLod !== null && (
        <PolygonDrawerModal
          open={drawerOpen}
          lodLevel={currentDrawingLod}
          geometryType={lodData[currentDrawingLod]?.type as any}
          initialCoordinates={
            lodData[currentDrawingLod]?.coordinates
              ? JSON.parse(lodData[currentDrawingLod].coordinates || '[]')
              : undefined
          }
          onClose={handleCloseDrawer}
          onSave={handleSaveDrawnPolygon}
          onAnchorPointReady={
            currentDrawingLod === 3 &&
            (lodData[3]?.type === 'Point' || lodData[3]?.type === 'Polygon')
              ? (point) => setAnchorPointLod3(point)
              : undefined
          }
        />
      )}
    </>
  );
};
