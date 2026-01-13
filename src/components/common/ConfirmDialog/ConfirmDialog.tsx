import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  ErrorOutline as ErrorIcon,
  WarningAmber as WarningIcon,
  InfoOutlined as InfoIcon,
  CheckCircleOutline as SuccessIcon,
} from '@mui/icons-material';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  disabled?: boolean;
  showIcon?: boolean;
  itemName?: string;
}

const variantConfig = {
  danger: {
    icon: ErrorIcon,
    color: '#f44336',
    confirmColor: 'error' as const,
  },
  warning: {
    icon: WarningIcon,
    color: '#ff9800',
    confirmColor: 'warning' as const,
  },
  info: {
    icon: InfoIcon,
    color: '#2196f3',
    confirmColor: 'primary' as const,
  },
  success: {
    icon: SuccessIcon,
    color: '#4caf50',
    confirmColor: 'success' as const,
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'info',
  isLoading = false,
  disabled = false,
  showIcon = true,
  itemName,
}) => {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {showIcon && (
            <IconComponent
              sx={{
                color: config.color,
                fontSize: 28,
              }}
            />
          )}
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        {!isLoading && (
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <DialogContentText sx={{ color: 'text.primary', mb: itemName ? 2 : 0 }}>
          {message}
        </DialogContentText>

        {itemName && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                wordBreak: 'break-word',
                color: 'text.primary',
              }}
            >
              {itemName}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          sx={{
            textTransform: 'none',
            minWidth: 80,
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={config.confirmColor}
          disabled={isLoading || disabled}
          sx={{
            textTransform: 'none',
            minWidth: 80,
          }}
        >
          {isLoading ? 'Đang xử lý...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
