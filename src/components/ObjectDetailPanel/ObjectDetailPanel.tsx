import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Drawer,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useObjectTypes } from '../../hooks/useObjectTypes';
import { attachmentService } from '../../services/attachmentService';
import { urbanObjectApiService } from '../../services/urbanObjectApiService';
import { useAuthStore } from '../../store/authStore';
import type { Attachment, UrbanObject } from '../../types/feature.types';
import { canDelete, canEdit } from '../../utils/permissions';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FileLightbox } from '../FileLightbox';
import { ModelViewer } from '../ModelViewer';
import { UploadAttachmentDialog } from '../UploadAttachmentDialog';

interface ObjectDetailPanelProps {
  open: boolean;
  onClose: () => void;
  objectId: string | null;
  urbanObjects?: UrbanObject[];
  onEdit?: (object: UrbanObject) => void;
  onDelete?: (objectId: string) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  style?: React.CSSProperties;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`detail-tabpanel-${index}`}
      aria-labelledby={`detail-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }} height="100%" bgcolor="background.blue">
          {children}
        </Box>
      )}
    </div>
  );
}

export const ObjectDetailPanel: React.FC<ObjectDetailPanelProps> = ({
  open,
  onClose,
  objectId,
  urbanObjects = [],
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuthStore();
  const { data: objectTypes = [] } = useObjectTypes();

  const [tabValue, setTabValue] = useState(0);
  const [objectData, setObjectData] = useState<UrbanObject | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deleteAttachmentDialog, setDeleteAttachmentDialog] = useState<{
    open: boolean;
    attachment: Attachment | null;
  }>({ open: false, attachment: null });
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false);
  const [deleteObjectDialog, setDeleteObjectDialog] = useState(false);
  const [isDeletingObject, setIsDeletingObject] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const userCanEdit = canEdit(user?.role);
  const userCanDelete = canDelete(user?.role);

  const attachmentUpload = useFileUpload({
    onUpload: async (file) => {
      if (!objectId) {
        throw new Error('Object ID is missing');
      }

      try {
        const response = await attachmentService.uploadAttachment(
          objectId,
          file
        );
        setAttachments((prev) => [response as any, ...(prev ?? [])]);
      } catch (error) {
        console.error('Failed to upload attachment:', error);
        throw error;
      }
    },
  });

  useEffect(() => {
    if (!open || !objectId) {
      setObjectData(null);
      setAttachments([]);
      setTabValue(0);
      return;
    }

    const loadObjectDetails = async () => {
      setIsLoading(true);
      try {
        let data = urbanObjects?.find((obj) => obj.id === objectId);

        if (data) {
          setObjectData(data);

          try {
            const loadedAttachments = await attachmentService.getAttachments(objectId);
            setAttachments(loadedAttachments);
          } catch (error) {
            console.warn('Failed to load attachments:', error);
            setAttachments([]);
          }

        } else {
          console.warn('Object not found:', objectId);
          setObjectData(null);
          setAttachments([]);
        }
      } catch (error) {
        console.error('Failed to load object details:', error, 'objectId:', objectId);
        setObjectData(null);
        setAttachments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadObjectDetails();
  }, [open, objectId, urbanObjects]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDeleteAttachmentClick = (attachment: Attachment) => {
    setDeleteAttachmentDialog({ open: true, attachment });
  };

  const handleDeleteAttachmentConfirm = async () => {
    if (!deleteAttachmentDialog.attachment || !objectId) return;

    setIsDeletingAttachment(true);
    try {
      await attachmentService.deleteAttachment(objectId, deleteAttachmentDialog.attachment.id);

      setAttachments((prev) =>
        prev.filter((att) => att.id !== deleteAttachmentDialog.attachment!.id)
      );

      setDeleteAttachmentDialog({ open: false, attachment: null });
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('Không thể xóa tệp đính kèm. Vui lòng thử lại.');
    } finally {
      setIsDeletingAttachment(false);
    }
  };

  const handleViewAttachment = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleLightboxNavigate = (newIndex: number) => {
    setLightboxIndex(newIndex);
  };

  const getTypeName = (type: string): string => {
    const typeObj = objectTypes.find((t) => t.value === type);
    return typeObj?.label || 'Unknown';
  };

  const handleEdit = () => {
    if (objectData && onEdit) {
      onEdit(objectData);
    }
  };

  const handleDelete = () => {
    setDeleteObjectDialog(true);
  };

  const handleDeleteObjectConfirm = async () => {
    if (!objectId || !user) return;

    setIsDeletingObject(true);
    try {
      await urbanObjectApiService.delete(objectId);

      const objectName = objectData?.name || objectData?.code || objectId;
      toast.success(`Công trình '${objectName}' đã được xóa thành công`);

      if (onDelete) {
        onDelete(objectId);
      }

      setDeleteObjectDialog(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete object:', error);
      toast.error('Không thể xóa đối tượng. Vui lòng thử lại.');
    } finally {
      setIsDeletingObject(false);
    }
  };

  return (
    <>
      {/* Collapsed Panel - Desktop & Mobile: right side */}
      {open && isCollapsed && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            zIndex: 1200,
            bgcolor: 'background.paper',
            borderLeft: 1,
            borderColor: 'divider',
            boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            height: 200,
            borderRadius: '8px 0 0 8px',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxHeight: 120,
              mb: 1,
            }}
          >
            {objectData?.name || 'Chi tiết đối tượng'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <IconButton onClick={() => setIsCollapsed(false)} size="small">
              <ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Side Drawer */}
      <Drawer
        anchor="right"
        open={open && !isCollapsed}
        onClose={onClose}
        variant="temporary"
        hideBackdrop={true}
        ModalProps={{
          disableEnforceFocus: true,
          disableAutoFocus: true,
          disableRestoreFocus: true,
          style: {
            pointerEvents: 'none',
          },
        }}
        PaperProps={{
          sx: {
            pointerEvents: 'auto',
          },
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: isMobile ? '100%' : 400,
            boxSizing: 'border-box',
            pointerEvents: 'auto',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Chi tiết
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton onClick={() => setIsCollapsed(true)} size="small">
                <ExpandMoreIcon />
              </IconButton>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto' }} display="flex" flexDirection="column">
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : objectData ? (
              <>
                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{
                      '& .MuiTab-root': {
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                      },
                    }}
                  >
                    <Tab label="Thông tin" />
                    <Tab label="3D Preview" />
                    <Tab label="Tệp đính kèm" />
                  </Tabs>
                </Box>

                {/* Tab Panels */}
                <Box sx={{ px: 2 }} flex={1}>
                  {/* Properties Tab */}
                  <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                      {/* Title */}
                      <Box sx={{ mb: 2 }} border="solid 2px #99A1AF" padding={1}>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                          Tên
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                          {objectData.name}
                        </Typography>
                      </Box>

                      {/* Info Grid - 2 columns */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        {/* First column */}
                        <Grid item xs={6}>
                          <Box border="solid 2px #99A1AF" padding={1}>
                            <Typography
                              variant="caption"
                              sx={{ color: 'text.secondary', fontWeight: 500 }}
                            >
                              Mã
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                              {objectData.code}
                            </Typography>
                          </Box>
                        </Grid>

                        {/* Second column */}
                        <Grid item xs={6}>
                          <Box border="solid 2px #99A1AF" padding={1}>
                            <Typography
                              variant="caption"
                              sx={{ color: 'text.secondary', fontWeight: 500 }}
                            >
                              Loại
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                              {getTypeName(objectData.type || '')}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {/* Properties Grid - 2 columns */}
                      {objectData.properties && (
                        <Grid container spacing={2}>
                          {objectData.properties?.height && (
                            <Grid item xs={6}>
                              <Box border="solid 2px #99A1AF" padding={1}>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'text.secondary', fontWeight: 500 }}
                                >
                                  Chiều cao
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                  {objectData.properties.height}m
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          {/* Area */}
                          {objectData.properties?.area && (
                            <Grid item xs={6}>
                              <Box border="solid 2px #99A1AF" padding={1}>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'text.secondary', fontWeight: 500 }}
                                >
                                  Diện tích pháp lệ
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                  {objectData.properties.area} m2
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      )}

                      {/* Additional Properties */}
                      <Card
                        sx={{
                          mt: 2,
                          bgcolor: 'background.paper',
                          border: 'solid 2px #99A1AF',
                          borderRadius: 0,
                        }}
                      >
                        <CardHeader
                          title="Thông tin chi tiết"
                          titleTypographyProps={{
                            variant: 'subtitle1',
                            sx: {
                              color: 'text.primary',
                              fontWeight: 600,
                              borderBottom: 'solid 2px #99A1AF',
                              backgroundColor: '#F3F4F6',
                              margin: -2,
                              padding: 1,
                            },
                          }}
                        />
                        <CardContent>
                          <Grid>
                            {/* Address */}
                            {Object.entries(objectData?.properties || {})?.map(([key, value]) => (
                              <Grid item xs={12} borderBottom="solid 1px #E0E0E0" p={1}>
                                <Box flexDirection="row" display="flex">
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', fontWeight: 500 }}
                                    width="30%"
                                  >
                                    {key}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 500, textAlign: 'right' }}
                                    flex={1}
                                  >
                                    {value}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        </CardContent>
                      </Card>
                    </Box>
                  </TabPanel>

                  {/* 3D Preview Tab */}
                  <TabPanel value={tabValue} index={1} style={{ height: '100%' }}>
                    {objectData?.modelAsset ? <ModelViewer url={objectData.modelAsset?.fileUrl} /> : (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          py: 6,
                        }}
                      >
                        <Box sx={{ textAlign: 'center' }}>
                          <Box
                            sx={{
                              fontSize: '3rem',
                              mb: 2,
                              color: 'text.secondary',
                            }}
                          >
                            🏢
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Không có mô hình 3D
                          </Typography>
                        </Box>
                      </Box>

                    )}
                  </TabPanel>

                  {/* Attachments Tab */}
                  <TabPanel value={tabValue} index={2}>
                    {attachments.length > 0 ? (
                      <Grid container spacing={2}>
                        {attachments.map((attachment, index) => (
                          <Grid item xs={12} key={attachment.id}>
                            <Box
                              sx={{
                                border: 'solid 2px #99A1AF',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                p: 1.5,
                                bgcolor: 'background.default',
                                borderRadius: 1,
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 40,
                                  height: 40,
                                  bgcolor: 'background.paper',
                                  borderRadius: 0.5,
                                  flexShrink: 0,
                                }}
                              >
                                {attachment.fileType?.startsWith('image/') ? '🖼️' : '📄'}
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {attachment.fileName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                                </Typography>
                              </Box>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => handleViewAttachment(index)}
                              >
                                Xem
                              </Button>
                              {/* Delete Button - Only for editors and admins */}
                              {userCanEdit && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteAttachmentClick(attachment)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Chưa có tệp đính kèm
                        </Typography>
                      </Box>
                    )}
                    {/* Upload Button - Only for editors and admins */}
                    {userCanEdit && (
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<UploadIcon />}
                          onClick={attachmentUpload.openDialog}
                          fullWidth
                        >
                          Upload tệp đính kèm
                        </Button>
                      </Box>
                    )}
                  </TabPanel>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Không tìm thấy thông tin đối tượng
                </Typography>
              </Box>
            )}
          </Box>

          {/* Footer with Edit/Delete buttons - Only for editors and admins */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.default',
              display: 'flex',
              gap: 1,
            }}
          >
            {userCanEdit && onEdit && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                fullWidth
                sx={{
                  bgcolor: '#d1d5dc',
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: '#b8bcc4',
                  },
                  textTransform: 'none',
                }}
              >
                Edit
              </Button>
            )}
            {userCanDelete && onDelete && (
              <IconButton
                onClick={handleDelete}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            )}

            {!userCanEdit && !userCanDelete && (
              <Typography
                variant="caption"
                sx={{
                  flexGrow: 1,
                  textAlign: 'center',
                  display: 'block',
                  color: 'text.secondary',
                  marginLeft: 'auto',
                }}
              >
                Đăng nhập để có quyền chỉnh sửa
              </Typography>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Upload Attachment Dialog */}
      <UploadAttachmentDialog
        open={attachmentUpload.dialogOpen}
        onClose={attachmentUpload.closeDialog}
        onUpload={attachmentUpload.handleUpload}
        isLoading={attachmentUpload.isLoading}
        error={attachmentUpload.error}
      />

      {/* Delete Attachment Confirmation Dialog */}
      <ConfirmDialog
        open={deleteAttachmentDialog.open}
        onClose={() => setDeleteAttachmentDialog({ open: false, attachment: null })}
        onConfirm={handleDeleteAttachmentConfirm}
        title="Xác nhận xóa"
        message="Bạn có chắc muốn xóa tệp đính kèm này? Thao tác này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeletingAttachment}
        itemName={deleteAttachmentDialog.attachment?.fileName}
      />

      {/* Delete Object Confirmation Dialog */}
      <ConfirmDialog
        open={deleteObjectDialog}
        onClose={() => setDeleteObjectDialog(false)}
        onConfirm={handleDeleteObjectConfirm}
        title="Xác nhận xóa"
        message="Bạn có chắc muốn xóa đối tượng này? Thao tác này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeletingObject}
        itemName={objectData?.name || objectData?.code}
      />

      {/* File Lightbox */}
      <FileLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        files={attachments}
        currentIndex={lightboxIndex}
        onNavigate={handleLightboxNavigate}
      />
    </>
  );
};
