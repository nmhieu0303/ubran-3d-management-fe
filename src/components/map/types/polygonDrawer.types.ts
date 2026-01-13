/**
 * Types cho PolygonDrawer component
 */

export interface PolygonDrawerModalProps {
  open: boolean;
  lodLevel: number;
  initialCoordinates?: CoordinatesInput;
  onClose: () => void;
  onSave: (coordinates: CoordinatesOutput, area: number, perimeter: number) => void;
}

export interface DrawingStats {
  area: number; // m²
  perimeter: number; // m
  pointCount: number;
}

export type InteractionMode = 'add' | 'select' | 'pan' | 'tilt';

export type CoordinatesInput =
  | number[][][] // Single polygon
  | number[][][][] // MultiPolygon
  | PolygonWithHeight[]; // New format

export type CoordinatesOutput = number[][][] | PolygonWithHeight[];

export interface PolygonWithHeight {
  coordinates: number[][][];
  height: number;
}
