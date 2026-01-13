import SceneView from '@arcgis/core/views/SceneView';
import WebScene from '@arcgis/core/WebScene';
import Compass from '@arcgis/core/widgets/Compass';
import Locate from '@arcgis/core/widgets/Locate';
import NavigationToggle from '@arcgis/core/widgets/NavigationToggle';
import Zoom from '@arcgis/core/widgets/Zoom';
import { Box } from '@mui/material';
import React, { memo, useEffect, useRef } from 'react';

interface MapContainerProps {
  onViewReady?: () => void;
  onViewCreated?: (view: SceneView) => void;
}

export const MapContainer: React.FC<MapContainerProps> = memo(({ onViewReady, onViewCreated }) => {
  const mapDiv = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);

  useEffect(() => {
    if (!mapDiv.current) return;

    const webscene = new WebScene({
      basemap: 'osm',
    });

    const view = new SceneView({
      container: mapDiv.current,
      map: webscene,
      camera: {
        position: {
          x: 106.719148,
          y: 10.762303,
          z: 3500,
          spatialReference: { wkid: 4326 },
        },
        heading: 357.02,
        tilt: 48.99,
      },
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
      qualityProfile: 'high',
    });

    viewRef.current = view;

    if (onViewCreated) {
      onViewCreated(view);
    }

    const zoom = new Zoom({ view });
    const compass = new Compass({ view });
    const navToggle = new NavigationToggle({ view });
    const locate = new Locate({ view });

    view.ui.add([locate, zoom, navToggle, compass], 'bottom-right');

    view
      .when(() => {
        if (onViewReady) {
          onViewReady();
        }
      })
      .catch((error) => {
        console.error('Error initializing SceneView:', error);
      });

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  return (
    <Box
      ref={mapDiv}
      sx={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
});
