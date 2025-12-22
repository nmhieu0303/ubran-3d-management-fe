import { useRef, useCallback, useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';
import { MapContainer } from '../../components/MapContainer';
import { SearchPanel } from '../../components/SearchPanel';
import { LayerPanel } from '../../components/LayerPanel';
import { AltitudeLodBox } from '../../components/AltitudeLodBox';
import { useMapStore } from '../../store/mapStore';
import { getLodLevelFromAltitude, LOD_LEVELS } from '../../constants';
import SceneView from '@arcgis/core/views/SceneView';

export const MapViewPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { searchPanelOpen, layerPanelOpen, toggleSearchPanel, toggleLayerPanel } = useMapStore();

  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const layerButtonRef = useRef<HTMLButtonElement>(null);

  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(null);
  const [layerAnchorEl, setLayerAnchorEl] = useState<HTMLElement | null>(null);

  const [altitude, setAltitude] = useState<number>(0);
  const [lod, setLod] = useState<string>(LOD_LEVELS.LOD0);

  // Ref for map view
  const viewRef = useRef<SceneView | null>(null);

  const handleViewReady = useCallback(() => {
    // Map view is ready
  }, []);

  const handleViewCreated = useCallback((view: SceneView) => {
    viewRef.current = view;

    view.watch('camera.position.z', (z: number) => {
      const alt = Math.round(z);
      setAltitude(alt);
      const lodLevel = getLodLevelFromAltitude(alt);
      setLod(lodLevel);
    });
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

  const handleFeatureSelect = (_feature: unknown) => { 
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

        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 1000,
            display: 'flex',
            gap: 1,
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
        </Box>

        <AltitudeLodBox
          altitude={altitude}
          lod={lod}
          isMobile={isMobile}
        />

        <SearchPanel
          open={searchPanelOpen}
          onClose={handleSearchClose}
          anchorEl={searchAnchorEl}
          onFeatureSelect={handleFeatureSelect}
        />

        <LayerPanel open={layerPanelOpen} onClose={handleLayerClose} anchorEl={layerAnchorEl} />
      </Box>
  );
};
