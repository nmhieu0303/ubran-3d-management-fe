import React, { useState } from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Typography,
  Button,
} from '@mui/material';
import { AutoAwesome as AutoIcon, Lock as FixedIcon } from '@mui/icons-material';

type LODMode = 'auto' | 'fixed';
type LODLevel = 0 | 1 | 2 | 3;

interface LODModeSelectorProps {
  mode: LODMode;
  fixedLodLevel: LODLevel;
  onModeChange: (mode: LODMode) => void;
  onLodLevelChange: (level: LODLevel) => void;
  onApply: () => void;
}


export const LODModeSelector: React.FC<LODModeSelectorProps> = ({
  mode,
  fixedLodLevel,
  onModeChange,
  onLodLevelChange,
  onApply,
}) => {
  const [tempMode, setTempMode] = useState<LODMode>(mode);
  const [tempLodLevel, setTempLodLevel] = useState<LODLevel>(fixedLodLevel);

  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: LODMode | null) => {
    if (newMode !== null) {
      setTempMode(newMode);
    }
  };

  const handleLodLevelChange = (event: any) => {
    setTempLodLevel(event.target.value as LODLevel);
  };

  const handleApply = () => {
    onModeChange(tempMode);
    onLodLevelChange(tempLodLevel);
    onApply();
  };

  return (
    <Paper
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        padding: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Chế độ LOD
      </Typography>

      {/* Mode Toggle */}
      <ToggleButtonGroup
        value={tempMode}
        exclusive
        onChange={handleModeChange}
        fullWidth
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            flex: 1,
            textTransform: 'none',
          },
        }}
      >
        <ToggleButton value="auto" title="Tự động cập nhật LOD theo độ cao">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AutoIcon sx={{ fontSize: '1rem' }} />
            <span>Tự động</span>
          </Box>
        </ToggleButton>
        <ToggleButton value="fixed" title="Giữ LOD level cố định">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FixedIcon sx={{ fontSize: '1rem' }} />
            <span>Cố định</span>
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>

      {/* LOD Level Selector - show only in fixed mode */}
      {tempMode === 'fixed' && (
        <FormControl fullWidth size="small">
          <InputLabel>Mức độ chi tiết</InputLabel>
          <Select value={tempLodLevel} onChange={handleLodLevelChange} label="Mức độ chi tiết">
            <MenuItem value={0}>LOD0 - Chi tiết thấp (zoom ra xa)</MenuItem>
            <MenuItem value={1}>LOD1 - Chi tiết trung bình</MenuItem>
            <MenuItem value={2}>LOD2 - Chi tiết cao</MenuItem>
            <MenuItem value={3}>LOD3 - Chi tiết cực cao (zoom vào gần)</MenuItem>
          </Select>
        </FormControl>
      )}

      {/* Mode description */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontStyle: 'italic',
          mt: 0.5,
        }}
      >
        {tempMode === 'auto'
          ? 'LOD tự động thay đổi dựa trên độ cao camera khi bạn zoom'
          : `Hiển thị LOD${tempLodLevel} cho tất cả độ cao`}
      </Typography>

      {/* Apply Button */}
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleApply}
          sx={{ textTransform: 'none' }}
        >
          Áp dụng
        </Button>
      </Box>
    </Paper>
  );
};
