import { useState } from 'react';

interface UseFileUploadOptions {
  onUpload?: (file: File) => Promise<void>;
}

interface UseFileUploadReturn {
  isLoading: boolean;
  error: string | null;
  openDialog: () => void;
  closeDialog: () => void;
  dialogOpen: boolean;
  handleUpload: (file: File) => Promise<void>;
  clearError: () => void;
}

export const useFileUpload = (options?: UseFileUploadOptions): UseFileUploadReturn => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = () => {
    setError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setError(null);
  };

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      if (options?.onUpload) {
        await options.onUpload(file);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    isLoading,
    error,
    openDialog,
    closeDialog,
    dialogOpen,
    handleUpload,
    clearError,
  };
};
