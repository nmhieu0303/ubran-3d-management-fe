import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloseIcon from '@mui/icons-material/Close';

export interface FileUploadConfig {
  title: string;
  acceptedFormats: string[];
  maxFileSize: number;
  acceptAttribute: string;
  formatDescription: string;
}

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  config: FileUploadConfig;
  isLoading?: boolean;
  error?: string | null;
}

export const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  open,
  onClose,
  onUpload,
  config,
  isLoading = false,
  error: externalError = null,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(externalError);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFile = (file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!config.acceptedFormats.includes(fileExtension)) {
      return `Định dạng không hỗ trợ. Hãy chọn file ${config.acceptedFormats.join(', ')}`;
    }

    if (file.size > config.maxFileSize) {
      return `Kích thước file vượt quá ${config.maxFileSize / 1024 / 1024}MB`;
    }

    return null;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
      } else {
        setError(null);
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
      } else {
        setError(null);
        setSelectedFile(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setError(null);
      await onUpload(selectedFile);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải file');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setDragActive(false);
    onClose();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
            {config.title}
          </Typography>
          <IconButton onClick={handleClose} size="small" disabled={isLoading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          sx={{
            border: '2px dashed',
            borderColor: dragActive ? 'primary.main' : '#ccc',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: dragActive ? 'rgba(25, 118, 210, 0.05)' : 'transparent',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(25, 118, 210, 0.03)',
            },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept={config.acceptAttribute}
            onChange={handleFileSelect}
          />

          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: 'action.disabled',
              mb: 1,
            }}
          />

          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
            Kéo và thả tập tin của bạn vào đây
          </Typography>

          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
            Hoặc
          </Typography>

          <Button
            component="span"
            sx={{
              cursor: 'pointer',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Duyệt tệp
          </Button>

          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
            {config.formatDescription}
          </Typography>
        </Box>

        {selectedFile && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: '#f5f5f5',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <FileDownloadIcon sx={{ color: 'action.disabled' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                {selectedFile.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
            {!isLoading && (
              <IconButton size="small" onClick={handleRemoveFile}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Hủy bỏ
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || isLoading}
          sx={{ minWidth: 100 }}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
