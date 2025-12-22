export interface LayerConfig {
  id: string;
  name: string;
  type: string;
  url?: string;
  visible: boolean;
  opacity?: number;
  minScale?: number;
  maxScale?: number;
}

export interface MapViewState {
  zoom: number;
  center: [number, number];
  heading?: number;
  tilt?: number;
}

export interface Bookmark {
  id: string;
  name: string;
  viewpoint: {
    camera: {
      position: {
        x: number;
        y: number;
        z: number;
      };
      heading: number;
      tilt: number;
    };
  };
}
