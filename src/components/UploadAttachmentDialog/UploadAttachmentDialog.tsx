import React from 'react';
import { FileUploadDialog } from '../FileUploadDialog';
import type { FileUploadConfig } from '../FileUploadDialog';

interface UploadAttachmentDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const ATTACHMENT_CONFIG: FileUploadConfig = {
  title: 'Upload Tệp định kèm',
  acceptedFormats: ['.jpg', '.jpeg', '.png', '.pdf'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptAttribute: '.jpg,.jpeg,.png,.pdf',
  formatDescription: 'Hỗ trợ các định dạng: Hình ảnh (JPG, PNG), PDF, Tài liệu (Tối đa 10MB)',
};

export const UploadAttachmentDialog: React.FC<UploadAttachmentDialogProps> = (props) => {
  return <FileUploadDialog {...props} config={ATTACHMENT_CONFIG} />;
};
