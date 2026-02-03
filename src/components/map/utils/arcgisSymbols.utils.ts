
import ExtrudeSymbol3DLayer from '@arcgis/core/symbols/ExtrudeSymbol3DLayer';
import PolygonSymbol3D from '@arcgis/core/symbols/PolygonSymbol3D';


export const create3DSymbol = (height: number): __esri.PolygonSymbol3D => {
  return new PolygonSymbol3D({
    symbolLayers: [
      new ExtrudeSymbol3DLayer({
        size: height,
        material: {
          color: [0, 149, 217, 0.8],
        },
        edges: {
          type: 'solid',
          color: [0, 0, 0, 0.8],
          size: 1,
        },
      }),
    ],
  });
};
