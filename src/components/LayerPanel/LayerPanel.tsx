import React from 'react';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  FormControlLabel,
  Checkbox,
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Button,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useMapStore } from '../../store/mapStore';
import { useObjectTypes } from '../../hooks/useObjectTypes';

interface LayerPanelProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ open, onClose, anchorEl }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { filteredObjectTypes, toggleFilteredObjectType, setFilteredObjectTypes } = useMapStore();
  const { data: objectTypes = [], loading: isLoading } = useObjectTypes();

  const handleLayerToggle = (typeId: string) => {
    toggleFilteredObjectType(typeId);
  };

  const allSelected = objectTypes.length > 0 && objectTypes.every((type) =>
    filteredObjectTypes.includes(type.value)
  );

  const handleSelectAll = () => {
    if (allSelected) {
      setFilteredObjectTypes([]);
    } else {
      setFilteredObjectTypes(objectTypes.map((type) => type.value));
    }
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
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : objectTypes.map((layer) => (
            <FormControlLabel
              key={layer.value}
              control={
                <Checkbox
                  checked={filteredObjectTypes.includes(layer.value)}
                  onChange={() => handleLayerToggle(layer.value)}
                />
              }
              label={layer.label}
              sx={{ display: 'block', mb: 1 }}
            />
          ))}
        </Box>

        {/* Select All Button */}
        {!isLoading && objectTypes.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              fullWidth
              size="small"
              variant={allSelected ? 'contained' : 'outlined'}
              onClick={handleSelectAll}
              sx={{ textTransform: 'none' }}
            >
              {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Button>
          </Box>
        )}

      </Box>
    </Popover>
  );
};
