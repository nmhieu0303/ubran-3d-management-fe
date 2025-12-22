import React, { useState } from 'react';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  Chip,
  Divider,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { mockFeatures } from '../../services/mockData';
import { FEATURE_TYPE_LABELS } from '../../constants';
import type { Feature } from '../../types/feature.types';

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  onFeatureSelect?: (feature: Feature) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ open, onClose, anchorEl, onFeatureSelect }) => {
  console.log('🔍 SearchPanel rerendered, open:', open);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredFeatures = mockFeatures.filter((feature) => {
    const matchesSearch =
      searchText === '' ||
      feature.name.toLowerCase().includes(searchText.toLowerCase()) ||
      feature.code.toLowerCase().includes(searchText.toLowerCase());
    const matchesType = filterType === 'all' || feature.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleFeatureClick = (feature: Feature) => {
    if (onFeatureSelect) {
      onFeatureSelect(feature);
    }
    onClose();
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
          width: isMobile ? 300 : 350,
          maxHeight: isMobile ? '60vh' : '70vh',
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: isMobile ? '60vh' : '70vh' }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Tìm kiếm công trình</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <TextField
            fullWidth
            placeholder="Tìm kiếm bằng tên, mã......"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Loại công trình</InputLabel>
            <Select
              value={filterType}
              label="Loại công trình"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              {Object.entries(FEATURE_TYPE_LABELS).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
          <List>
            {filteredFeatures.map((feature) => (
              <ListItemButton
                key={feature.id}
                onClick={() => handleFeatureClick(feature)}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <LocationIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2">{feature.name}</Typography>
                    <Chip
                      label={FEATURE_TYPE_LABELS[feature.type]}
                      size="small"
                      sx={{ height: 20 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Mã: {feature.code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {feature.properties.address || 'N/A'}
                  </Typography>
                </Box>
              </ListItemButton>
            ))}
          </List>
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" align="center">
            Found {filteredFeatures.length} results
          </Typography>
        </Box>
      </Box>
    </Popover>
  );
};
