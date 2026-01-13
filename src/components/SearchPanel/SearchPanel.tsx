import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { urbanObjectApiService } from '../../services/urbanObjectApiService';
import { useObjectTypes } from '../../hooks/useObjectTypes';
import type { UrbanObject } from '../../types/feature.types';

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  onFeatureSelect?: (feature: UrbanObject) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ open, onClose, anchorEl, onFeatureSelect }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: objectTypes = [] } = useObjectTypes();
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<UrbanObject[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchText) {
      setSearchResults([]);
      return;
    }

    const searchDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await urbanObjectApiService.search(searchText);
        setSearchResults(response.data);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounce);
  }, [searchText]);

  const filteredFeatures = searchResults.filter((obj) => {
    const matchesType = filterType === 'all' || obj.typeId === filterType || obj.code === filterType;
    return matchesType;
  });

  const handleFeatureClick = (feature: UrbanObject) => {
    if (onFeatureSelect) {
      onFeatureSelect(feature);
    }
    onClose();
  };

  const getTypeName = (typeId: string): string => {
    const type = objectTypes.find(t => t.value === typeId);
    return type?.label || typeId;
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
            placeholder="Tìm kiếm bằng tên, địa chỉ......"
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
              endAdornment: isSearching && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
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
              {objectTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
          <List>
            {filteredFeatures.length > 0 ? (
              filteredFeatures.map((obj) => (
                <ListItemButton
                  key={obj.id}
                  onClick={() => handleFeatureClick(obj)}
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
                      <Typography variant="subtitle2">{obj.name}</Typography>
                      <Chip
                        label={getTypeName(obj.typeId)}
                        size="small"
                        sx={{ height: 20 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ID: {obj.id}
                    </Typography>
                    {obj.properties?.address && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {obj.properties.address as string}
                      </Typography>
                    )}
                    {obj.properties?.height && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Chiều cao: {obj.properties.height}m
                      </Typography>
                    )}
                  </Box>
                </ListItemButton>
              ))
            ) : searchText ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Không tìm thấy kết quả
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Nhập từ khóa để tìm kiếm
                </Typography>
              </Box>
            )}
          </List>
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" align="center" color="text.secondary">
            {searchText && `${filteredFeatures.length} kết quả`}
          </Typography>
        </Box>
      </Box>
    </Popover>
  );
};
