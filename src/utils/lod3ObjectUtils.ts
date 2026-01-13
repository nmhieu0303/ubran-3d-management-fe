import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Point from '@arcgis/core/geometry/Point';
import { PointSymbol3D, ObjectSymbol3DLayer } from '@arcgis/core/symbols';
import type { UrbanObject, ModelTransform } from '../types/feature.types';

const DEFAULT_GLB_DIMENSIONS = {
  width: 100,
  height: 100,
  depth: 100,
};

export const renderLod3Object = (
  object: UrbanObject,
  modelUrl: string,
  layer: GraphicsLayer
): boolean => {
  try {
    const lod3 = object.lods?.find((lod) => lod.lodLevel === 3);
    if (!lod3) {
      console.warn('No LOD3 found for object', object.id);
      return false;
    }

    let anchorPoint: Point | null = null;
    if (lod3.geometryType === 'Point' && lod3.geom.coordinates) {
      const coords = lod3.geom.coordinates;
      anchorPoint = new Point({
        x: coords[0],
        y: coords[1],
        z: coords[2] || 0,
        spatialReference: { wkid: 4326 },
      });
    } else if ((lod3.geometryType === 'Polygon' || lod3.geometryType === 'MultiPolygon') && lod3.geom.coordinates) {
      const coords = lod3.geom.coordinates;
      let firstRing: number[][] = [];

      if (lod3.geometryType === 'Polygon') {
        firstRing = coords[0] || [];
      } else {
        firstRing = coords[0]?.[0] || [];
      }

      if (firstRing.length > 0) {
        let sumX = 0, sumY = 0, sumZ = 0;
        firstRing.forEach((point) => {
          sumX += point[0];
          sumY += point[1];
          sumZ += point[2] || 0;
        });

        anchorPoint = new Point({
          x: sumX / firstRing.length,
          y: sumY / firstRing.length,
          z: sumZ / firstRing.length,
          spatialReference: { wkid: 4326 },
        });
      }
    }

    if (!anchorPoint) {
      console.warn('Could not determine anchor point for LOD3 object', object.id);
      return false;
    }

    const transform: Partial<ModelTransform> = object.modelTransform || {};
    const positionOffset = transform.position || { x: 0, y: 0, z: 0 };

    const displayPosition = new Point({
      x: anchorPoint.x + (positionOffset.x || 0),
      y: anchorPoint.y + (positionOffset.y || 0),
      z: ((anchorPoint as any).z || 0) + (positionOffset.z || 0),
      spatialReference: anchorPoint.spatialReference,
    });

    const scale = transform.scale || { x: 1, y: 1, z: 1 };
    const width = DEFAULT_GLB_DIMENSIONS.width * (scale.x || 1);
    const height = DEFAULT_GLB_DIMENSIONS.height * (scale.y || 1);
    const depth = DEFAULT_GLB_DIMENSIONS.depth * (scale.z || 1);

    const modelSymbol = new PointSymbol3D({
      symbolLayers: [
        new ObjectSymbol3DLayer({
          resource: { href: modelUrl },
          width: width,
          height: height,
          depth: depth,
        } as any),
      ],
    });

    const graphic = new Graphic({
      geometry: displayPosition,
      symbol: modelSymbol,
      attributes: {
        type: 'urban-object',
        objectId: object.id,
        objectName: object.name,
        lodLevel: 3,
        hasModelFile: true,
      },
      popupTemplate: {
        title: object.name,
        content: `
          <div>
            <p><strong>Code:</strong> ${object.code}</p>
            <p><strong>Type:</strong> ${object.type?.name || 'Unknown'}</p>
            <p><strong>Height:</strong> ${object.properties?.height || 'N/A'} m</p>
            ${transform.position ? `<p><strong>Position:</strong> (${transform.position.x}, ${transform.position.y}, ${transform.position.z})</p>` : ''}
            ${transform.scale ? `<p><strong>Scale:</strong> (${transform.scale.x}, ${transform.scale.y}, ${transform.scale.z})</p>` : ''}
          </div>
        `,
      },
    });

    layer.add(graphic);
    return true;
  } catch (error) {
    console.error('Error rendering LOD3 object:', error);
    return false;
  }
};


export const calculateModelDimensions = (scale?: { x: number; y: number; z: number }) => {
  return {
    width: DEFAULT_GLB_DIMENSIONS.width * (scale?.x || 1),
    height: DEFAULT_GLB_DIMENSIONS.height * (scale?.y || 1),
    depth: DEFAULT_GLB_DIMENSIONS.depth * (scale?.z || 1),
  };
};


export const calculateModelPosition = (
  basePosition: Point,
  positionOffset?: { x: number; y: number; z: number }
): Point => {
  return new Point({
    x: basePosition.x + (positionOffset?.x || 0),
    y: basePosition.y + (positionOffset?.y || 0),
    z: (basePosition.z || 0) + (positionOffset?.z || 0),
    spatialReference: basePosition.spatialReference,
  });
};

export const extractAnchorPointFromGeometry = (
  geom: any,
  type: string
): Point | null => {
  try {
    if (type === 'Point' && geom.coordinates) {
      const coords = geom.coordinates;
      return new Point({
        x: coords[0],
        y: coords[1],
        z: coords[2] || 0,
        spatialReference: { wkid: 4326 },
      });
    } else if ((type === 'Polygon' || type === 'MultiPolygon') && geom.coordinates) {
      const coords = geom.coordinates;
      let firstRing: number[][] = [];

      if (type === 'Polygon') {
        firstRing = coords[0] || [];
      } else {
        firstRing = coords[0]?.[0] || [];
      }

      if (firstRing.length > 0) {
        let sumX = 0, sumY = 0, sumZ = 0;
        firstRing.forEach((point) => {
          sumX += point[0];
          sumY += point[1];
          sumZ += point[2] || 0;
        });

        return new Point({
          x: sumX / firstRing.length,
          y: sumY / firstRing.length,
          z: sumZ / firstRing.length,
          spatialReference: { wkid: 4326 },
        });
      }
    }
  } catch (error) {
    console.error('Error extracting anchor point:', error);
  }

  return null;
};
