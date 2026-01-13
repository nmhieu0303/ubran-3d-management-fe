
import React from 'react';
import { IconButton, Tooltip, Badge } from '@mui/material';
import { Transform as TransformIcon } from '@mui/icons-material';

interface TransformToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export const TransformToggle: React.FC<TransformToggleProps> = ({
  enabled,
  onToggle,
  disabled = false
}) => {
  return (
    <Tooltip title={enabled ? "Tắt Transform Mode" : "Bật Transform Mode (Move/Rotate/Scale)"}>
      <span>
        <IconButton
          onClick={() => onToggle(!enabled)}
          disabled={disabled}
          sx={{
            bgcolor: enabled ? 'warning.main' : 'background.paper',
            color: enabled ? 'white' : 'text.primary',
            boxShadow: 2,
            '&:hover': {
              bgcolor: enabled ? 'warning.dark' : 'background.paper'
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
            }
          }}
        >
          <Badge
            color="success"
            variant="dot"
            invisible={!enabled}
          >
            <TransformIcon />
          </Badge>
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default TransformToggle;
