import { useMapStore } from '@/store/mapStore';
import SceneView from '@arcgis/core/views/SceneView';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  FormControlLabel,
  IconButton,
  Paper,
  Popover,
  Slider,
  Switch,
  Typography,
} from '@mui/material';
import React, { useEffect } from 'react';

interface EnvironmentSettingsProps {
  view?: SceneView;
  onClose?: () => void;
  open?: boolean;
  anchorEl?: HTMLElement | null;
}

export const EnvironmentSettings: React.FC<EnvironmentSettingsProps> = ({
  view,
  onClose,
  open,
  anchorEl,
}) => {
  const { timeOfDay, timeSimulationEnabled, setTimeOfDay, setTimeSimulationEnabled } =
    useMapStore();

  useEffect(() => {
    try {
      if (timeSimulationEnabled) {
        const [hours, minutes] = timeOfDay.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);

        if (view?.environment?.lighting) {
          view.environment.lighting.date = date;
        }
      } else {
        const now = new Date();
        if (view?.environment?.lighting) {
          view.environment.lighting.date = now;
        }
      }
    } catch (error) {
      console.error('EnvironmentSettings: Error setting time:', error);
    }
  }, [timeOfDay, timeSimulationEnabled, view]);

  const handleTimeChange = (_: Event, value: number | number[]) => {
    const hours = Math.floor((value as number) / 60);
    const minutes = (value as number) % 60;
    setTimeOfDay(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  };

  const timeValue = timeOfDay
    .split(':')
    .reduce(
      (acc: number, val: string, idx: number) => acc + parseInt(val) * (idx === 0 ? 60 : 1),
      0
    );

  const currentTime = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <Popover
      open={open || false}
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
    >
      <Paper sx={{ p: 2, width: 280 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Cài đặt thời gian</Typography>
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={timeSimulationEnabled}
                onChange={(e) => setTimeSimulationEnabled(e.target.checked)}
              />
            }
            label="Giả lập thời gian"
          />
        </Box>

        {!timeSimulationEnabled && (
          <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Thời gian hiện tại: {currentTime}
            </Typography>
          </Box>
        )}

        {timeSimulationEnabled && (
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Thời gian: {timeOfDay}</Typography>
            <Slider
              value={timeValue}
              onChange={handleTimeChange}
              min={0}
              max={1439} // 24*60 - 1
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => {
                const hours = Math.floor(value / 60);
                const minutes = value % 60;
                return `${hours.toString().padStart(2, '0')}:${minutes
                  .toString()
                  .padStart(2, '0')}`;
              }}
            />
          </Box>
        )}
      </Paper>
    </Popover>
  );
};
