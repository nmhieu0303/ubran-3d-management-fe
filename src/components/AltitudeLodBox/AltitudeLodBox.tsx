import React from 'react';
import { Box, Typography } from '@mui/material';

interface AltitudeLodBoxProps {
  altitude: number;
  lod: string;
  isMobile: boolean;
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
  lod,
  isMobile,
}) => {
  const lodStyle = getLodStyle(lod);

  return (
    <Box
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
              {lod}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
