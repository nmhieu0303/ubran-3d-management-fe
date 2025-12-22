import React, { useRef, useEffect, memo } from 'react';
import { Box } from '@mui/material';
import SceneView from '@arcgis/core/views/SceneView';
import WebScene from '@arcgis/core/WebScene';
import Locate from '@arcgis/core/widgets/Locate';
import Compass from '@arcgis/core/widgets/Compass';
import NavigationToggle from '@arcgis/core/widgets/NavigationToggle';
import Zoom from '@arcgis/core/widgets/Zoom';

interface MapContainerProps {
    onViewReady?: () => void;
    onViewCreated?: (view: SceneView) => void;
}

export const MapContainer: React.FC<MapContainerProps> = memo(({ onViewReady, onViewCreated }) => {
    console.log('🗺️ MapContainer rerendered');
    const mapDiv = useRef<HTMLDivElement>(null);
    const viewRef = useRef<SceneView | null>(null);

    useEffect(() => {
        console.log('🚀 MapContainer useEffect running - initializing map');
        if (!mapDiv.current) return;

        const webscene = new WebScene({
            basemap: 'osm',
        });

        const view = new SceneView({
            container: mapDiv.current,
            map: webscene,
            camera: {
                position: {
                    x: 106.7,
                    y: 10.8,
                    z: 5000,
                },
                heading: 0,
                tilt: 45,
            },
            ui: {
                components: []
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


        view.ui.add([locate, zoom, navToggle, compass], "bottom-right");

        view.when(() => {
            console.log('✅ SceneView ready');
            if (onViewReady) {
                onViewReady();
            }
        }).catch((error) => {
            console.error('❌ Error initializing SceneView:', error);
        });

        return () => {
            console.log('🧹 MapContainer cleanup - destroying map');
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
