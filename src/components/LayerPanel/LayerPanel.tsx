import React from 'react';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  FormControlLabel,
  Checkbox,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { mockLayers } from '../../services/mockData';
import { useMapStore } from '../../store/mapStore';

interface LayerPanelProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ open, onClose, anchorEl }) => {
  console.log('📋 LayerPanel rerendered, open:', open);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { visibleLayers, toggleLayer } = useMapStore();

  const handleLayerToggle = (layerId: string) => {
    toggleLayer(layerId);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      sx={{
        '& .MuiPopover-paper': {
          width: isMobile ? 280 : 300,
          maxHeight: isMobile ? '50vh' : '60vh',
          overflow: 'auto',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Layers</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box>
          {mockLayers.map((layer) => (
            <FormControlLabel
              key={layer.id}
              control={
                <Checkbox
                  checked={visibleLayers.includes(layer.id)}
                  onChange={() => handleLayerToggle(layer.id)}
                />
              }
              label={layer.name}
              sx={{ display: 'block', mb: 1 }}
            />
          ))}
        </Box>
      </Box>
    </Popover>
  );
};
