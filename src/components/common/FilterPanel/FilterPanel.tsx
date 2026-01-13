import React from 'react';
import {
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Box,
  Tooltip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { SearchBar } from '../SearchBar';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  name: string;
  label: string;
  options: FilterOption[];
  value: string;
}

interface FilterPanelProps {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  filters: FilterConfig[];
  onFilterChange: (filterName: string, value: string) => void;
  onClearFilters: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSearch,
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const handleFilterChange = (filterName: string) => (event: SelectChangeEvent<string>) => {
    onFilterChange(filterName, event.target.value);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <SearchBar
            value={searchValue}
            onChange={onSearchChange}
            onSearch={onSearch}
            placeholder={searchPlaceholder}
          />
        </Grid>
        {filters.map((filter) => (
          <Grid item  md={Math.floor(8 / (filters.length + 1))} key={filter.name}>
            <FormControl fullWidth>
              <InputLabel>{filter.label}</InputLabel>
              <Select
                value={filter.value}
                onChange={handleFilterChange(filter.name)}
                label={filter.label}
              >
                <MenuItem value="">Tất cả</MenuItem>
                {filter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        ))}

        
        <Grid item md={filters.length > 0 ? 2 : 8}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={onSearch}
              fullWidth
            >
              Tìm
            </Button>
            <Tooltip title="Xóa bộ lọc">
              <IconButton onClick={onClearFilters} color="default">
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};
