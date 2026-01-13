import React from 'react';
import {
    Dialog,
    DialogContent,
    IconButton,
    Box,
    Typography,
    CircularProgress,
} from '@mui/material';
import {
    Close as CloseIcon,
    Download as DownloadIcon,
    NavigateBefore as NavigateBeforeIcon,
    NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import type { Attachment } from '../../types/feature.types';

interface FileLightboxProps {
    open: boolean;
    onClose: () => void;
    files: Attachment[];
    currentIndex: number;
    onNavigate?: (newIndex: number) => void;
}

export const FileLightbox: React.FC<FileLightboxProps> = ({
    open,
    onClose,
    files,
    currentIndex,
    onNavigate,
}) => {
    const currentFile = files[currentIndex];
    const hasMultipleFiles = files.length > 1;

    if (!currentFile) return null;

    const handlePrevious = () => {
        if (onNavigate && currentIndex > 0) {
            onNavigate(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (onNavigate && currentIndex < files.length - 1) {
            onNavigate(currentIndex + 1);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = currentFile.fileUrl;
        link.download = currentFile.fileName || 'file';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowLeft') {
            handlePrevious();
        } else if (event.key === 'ArrowRight') {
            handleNext();
        } else if (event.key === 'Escape') {
            onClose();
        }
    };

    const renderFileContent = () => {
        const fileType = currentFile.fileType?.toLowerCase();

        // Image files
        if (fileType?.startsWith('image/')) {
            return (
                <Box
                    component="img"
                    src={currentFile.fileUrl}
                    alt={currentFile.fileName}
                    sx={{
                        maxWidth: '100%',
                        maxHeight: '80vh',
                        objectFit: 'contain',
                        borderRadius: 1,
                    }}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSI+SW1hZ2Ugbm90IGZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                    }}
                />
            );
        }

        // PDF files
        if (fileType === 'application/pdf') {
            return (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Box sx={{ fontSize: '4rem', mb: 2 }}>📕</Box>
                    <Typography variant="h6" gutterBottom>
                        {currentFile.fileName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Nhấn vào nút tải xuống để xem PDF
                    </Typography>
                </Box>
            );
        }

        // Video files
        if (fileType?.startsWith('video/')) {
            return (
                <Box
                    component="video"
                    controls
                    src={currentFile.fileUrl}
                    sx={{
                        maxWidth: '100%',
                        maxHeight: '80vh',
                        borderRadius: 1,
                    }}
                >
                    Trình duyệt của bạn không hỗ trợ phát video.
                </Box>
            );
        }

        // Audio files
        if (fileType?.startsWith('audio/')) {
            return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Box sx={{ fontSize: '4rem', mb: 2 }}>🎵</Box>
                    <Typography variant="h6" gutterBottom>
                        {currentFile.fileName}
                    </Typography>
                    <Box
                        component="audio"
                        controls
                        src={currentFile.fileUrl}
                        sx={{ width: '100%', maxWidth: 500, mt: 2 }}
                    >
                        Trình duyệt của bạn không hỗ trợ phát âm thanh.
                    </Box>
                </Box>
            );
        }

        // Text files
        if (fileType?.startsWith('text/') ||
            fileType === 'application/json' ||
            fileType === 'application/xml') {
            return (
                <Box
                    component="iframe"
                    src={currentFile.fileUrl}
                    title={currentFile.fileName}
                    sx={{
                        width: '100%',
                        height: '80vh',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                    }}
                />
            );
        }

        // Default - File not previewable
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Box sx={{ fontSize: '4rem', mb: 2 }}>📄</Box>
                <Typography variant="h6" gutterBottom>
                    {currentFile.fileName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Không thể xem trước loại tệp này
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Loại tệp: {currentFile.fileType}
                </Typography>
            </Box>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            onKeyDown={handleKeyDown}
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    backgroundImage: 'none',
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {currentFile.fileName}
                    </Typography>
                    {hasMultipleFiles && (
                        <Typography variant="caption" color="text.secondary">
                            {currentIndex + 1} / {files.length}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                        onClick={handleDownload}
                        title="Tải xuống"
                        size="small"
                    >
                        <DownloadIcon />
                    </IconButton>
                    <IconButton onClick={onClose} title="Đóng" size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Content */}
            <DialogContent
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    minHeight: 400,
                    bgcolor: '#f5f5f5',
                }}
            >
                {renderFileContent()}

                {/* Navigation buttons - only show if multiple files */}
                {hasMultipleFiles && (
                    <>
                        {/* Previous button */}
                        {currentIndex > 0 && (
                            <IconButton
                                onClick={handlePrevious}
                                sx={{
                                    position: 'absolute',
                                    left: 16,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    bgcolor: 'background.paper',
                                    boxShadow: 2,
                                    '&:hover': {
                                        bgcolor: 'background.paper',
                                        boxShadow: 4,
                                    },
                                }}
                            >
                                <NavigateBeforeIcon />
                            </IconButton>
                        )}

                        {/* Next button */}
                        {currentIndex < files.length - 1 && (
                            <IconButton
                                onClick={handleNext}
                                sx={{
                                    position: 'absolute',
                                    right: 16,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    bgcolor: 'background.paper',
                                    boxShadow: 2,
                                    '&:hover': {
                                        bgcolor: 'background.paper',
                                        boxShadow: 4,
                                    },
                                }}
                            >
                                <NavigateNextIcon />
                            </IconButton>
                        )}
                    </>
                )}
            </DialogContent>

            {/* Footer with file info */}
            <Box
                sx={{
                    p: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                <Typography variant="caption" color="text.secondary">
                    Kích thước: {(Number(currentFile.fileSize) / 1024 / 1024).toFixed(2)} MB
                </Typography>
                {currentFile.description && (
                    <>
                        <Typography variant="caption" color="text.secondary">
                            •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {currentFile.description}
                        </Typography>
                    </>
                )}
                <Typography variant="caption" color="text.secondary">
                    •
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Tải lên: {new Date(currentFile.uploadedAt).toLocaleString('vi-VN')}
                </Typography>
            </Box>
        </Dialog>
    );
};
