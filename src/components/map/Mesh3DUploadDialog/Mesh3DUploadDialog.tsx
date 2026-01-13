import React, { useState, useRef } from 'react';
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
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  FilePresent as FileIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Point } from '@arcgis/core/geometry';

interface Mesh3DUploadDialogProps {
  open: boolean;
  onClose: () => void;
  anchorPoint: Point;
  urbanObjectId?: string;
  onUploadSuccess: (result: { modelUrl: string; fileName: string }) => void;
  disabled?: boolean;
}

const SUPPORTED_FORMATS = ['glb', 'gltf', 'obj', 'fbx'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPT_TYPES = '.glb,.gltf,.obj,.fbx';

export const Mesh3DUploadDialog: React.FC<Mesh3DUploadDialogProps> = ({
  open,
  onClose,
  anchorPoint,
  urbanObjectId,
  onUploadSuccess,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isValidFormat = (file: File): boolean => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return SUPPORTED_FORMATS.includes(extension);
  };

  const isValidSize = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  };

  const getFileError = (file: File): string | null => {
    if (!isValidFormat(file)) {
      return `Invalid format. Supported: ${SUPPORTED_FORMATS.join(', ').toUpperCase()}`;
    }
    if (!isValidSize(file)) {
      return `File too large. Maximum size: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`;
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const fileError = getFileError(file);

    if (fileError) {
      setError(fileError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle upload
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);
      if (urbanObjectId) {
        formData.append('urbanObjectId', urbanObjectId);
      }
      formData.append('anchorLat', anchorPoint.y.toString());
      formData.append('anchorLon', anchorPoint.x.toString());
      formData.append('anchorZ', (anchorPoint.z ?? 0).toString());

      const response = await uploadWithProgress(formData);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      onUploadSuccess({
        modelUrl: result.url || result.modelUrl,
        fileName: selectedFile.name,
      });

      // Reset
      setSelectedFile(null);
      setUploadProgress(0);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadWithProgress = (formData: FormData): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(
            new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
            })
          );
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', '/api/urban-objects/mesh3d/upload');
      xhr.send(formData);
    });
  };

  const handleDropAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setError(null);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={uploading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">📦 Upload 3D Model</Typography>
          <Button
            onClick={handleClose}
            disabled={uploading}
            size="small"
            sx={{ minWidth: 'auto' }}
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        {/* Anchor Point Info */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Anchor Point:</strong> [
            {anchorPoint.x.toFixed(6)}, {anchorPoint.y.toFixed(6)}, {(anchorPoint.z ?? 0).toFixed(2)}]
          </Typography>
        </Alert>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* File Drop Area */}
        {!uploading ? (
          <Paper
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleDropAreaClick}
            sx={{
              p: 3,
              mb: 3,
              border: '2px dashed',
              borderColor: isDragging ? 'primary.main' : 'divider',
              backgroundColor: isDragging ? 'action.hover' : 'background.paper',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
          >
            <CloudUploadIcon
              sx={{
                fontSize: 48,
                color: 'primary.main',
                mb: 1,
              }}
            />
            <Typography variant="subtitle1" gutterBottom>
              Drag & Drop Model Here
            </Typography>
            <Typography variant="body2" color="textSecondary">
              or click to select a file
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Supported: {SUPPORTED_FORMATS.join(', ').toUpperCase()} (Max {(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB)
            </Typography>
          </Paper>
        ) : null}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={uploading}
        />

        {/* Selected File Info */}
        {selectedFile && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: 'success.light' }}>
            <Stack spacing={1.5}>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircleIcon color="success" />
                <Typography variant="body2" fontWeight="bold">
                  File Selected
                </Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <FileIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={selectedFile.name}
                    secondary={`Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`}
                  />
                </ListItem>
              </List>
              {uploading && (
                <Box>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Uploading: {uploadProgress.toFixed(0)}%
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        )}

        {/* File Format Info */}
        <Paper sx={{ p: 2, backgroundColor: 'info.light' }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Supported Formats:
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {SUPPORTED_FORMATS.map((format) => (
              <Chip
                key={format}
                label={format.toUpperCase()}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || uploading || disabled}
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
