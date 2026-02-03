import React, { useState } from 'react';
import { Box, Typography, Popover } from '@mui/material';
import { LODModeSelector } from '../LODModeSelector';

interface AltitudeLodBoxProps {
  altitude: number;
  lod: string;
  isMobile: boolean;
  lodMode?: 'auto' | 'fixed';
  fixedLodLevel?: 0 | 1 | 2 | 3;
  currentLodLevel?: 0 | 1 | 2 | 3;
  onLodModeChange?: (mode: 'auto' | 'fixed') => void;
  onLodLevelChange?: (level: 0 | 1 | 2 | 3) => void;
  onApply?: () => void;
}

const LOD_LEVELS = {
  LOD0: {
    backgroundColor: '#E2E7FF',
    textColor: '#0003C1',
  },
  LOD1: {
    backgroundColor: '#E7FFE2',
    textColor: '#02B145',
  },
  LOD2: {
    backgroundColor: '#efeda8',
    textColor: '#C18400',
  },
  LOD3: {
    backgroundColor: '#FFEFE2',
    textColor: '#C15A00',
  },
} as const;

type LodLevel = keyof typeof LOD_LEVELS;

const getLodStyle = (lod: string) => {
  const level = lod as LodLevel;
  return LOD_LEVELS[level] || {
    backgroundColor: '#F0F0F0',
    textColor: '#000000',
  };
};

export const AltitudeLodBox: React.FC<AltitudeLodBoxProps> = ({
  altitude,
  isMobile,
  lodMode = 'auto',
  fixedLodLevel = 0,
  currentLodLevel = 0,
  onLodModeChange,
  onLodLevelChange,
  onApply,
}) => {
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLElement | null>(null);
  const popoverOpen = Boolean(popoverAnchorEl);

  const handleBoxClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setPopoverAnchorEl(e.currentTarget);
  };

  const handlePopoverClose = () => {
    setPopoverAnchorEl(null);
  };

  const handleModeChange = (mode: 'auto' | 'fixed') => {
    onLodModeChange?.(mode);
  };

  const handleLodLevelChange = (level: 0 | 1 | 2 | 3) => {
    onLodLevelChange?.(level);
  };

  const handleApply = () => {
    handlePopoverClose();
    onApply?.();
  };

  // Determine which LOD to display in label
  const displayLodLevel = lodMode === 'fixed' ? fixedLodLevel : currentLodLevel;
  const displayLodString = `LOD${displayLodLevel}`;
  const lodStyle = getLodStyle(displayLodString);

  return (
    <>
      <Box
        onClick={handleBoxClick}
        sx={{
          position: 'absolute',
          bottom: isMobile ? 16 : 24,
          left: isMobile ? 16 : 24,
          color: '#000000',
          backgroundColor: '#ffffff',
          borderRadius: 2,
          padding: isMobile ? '8px 12px' : '12px 16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          minWidth: isMobile ? 120 : 140,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-2px)',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant={isMobile ? 'body2' : 'body1'}
              sx={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
              }}
            >
              Độ cao:
            </Typography>
            <Typography
              variant={isMobile ? 'body2' : 'body1'}
              sx={{
                fontWeight: 700,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
              }}
            >
              {altitude.toFixed(1)}m
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant={isMobile ? 'body2' : 'body1'}
              sx={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
              }}
            >
              Độ chi tiết:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, backgroundColor: lodStyle.backgroundColor, px: 1, py: 0.25, borderRadius: 1 }}>
              <Typography
                variant={isMobile ? 'body2' : 'body1'}
                sx={{
                  fontWeight: 700,
                  color: lodStyle.textColor,
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                }}
              >
                {displayLodString}
              </Typography>
            </Box>
          </Box>

          {/* Mode indicator */}
          <Box sx={{ mt: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.65rem',
                color: 'text.secondary',
                display: 'block',
              }}
            >
              {lodMode === 'auto' ? '🔄 Tự động' : '📌 Cố định'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* LOD Mode Selector Popover */}
      <Popover
        open={popoverOpen}
        anchorEl={popoverAnchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        sx={{
          mt: 1,
        }}
      >
        <Box sx={{ p: 2, minWidth: 280 }}>
          <LODModeSelector
            mode={lodMode}
            fixedLodLevel={fixedLodLevel}
            onModeChange={handleModeChange}
            onLodLevelChange={handleLodLevelChange}
            onApply={handleApply}
          />
        </Box>
      </Popover>
    </>
  );
};
