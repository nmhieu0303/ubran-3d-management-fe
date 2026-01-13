import React from 'react';
import { FileUploadDialog } from '../FileUploadDialog';
import type { FileUploadConfig } from '../FileUploadDialog';

interface Upload3DModelDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const MODEL_3D_CONFIG: FileUploadConfig = {
  title: 'Upload 3D Model',
  acceptedFormats: ['.glb', '.gltf'],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  acceptAttribute: '.glb,.gltf',
  formatDescription: 'Hỗ trợ các định dạng: GLB, GLTF (Tối đa 50MB)',
};

export const Upload3DModelDialog: React.FC<Upload3DModelDialogProps> = (props) => {
  return <FileUploadDialog {...props} config={MODEL_3D_CONFIG} />;
};
