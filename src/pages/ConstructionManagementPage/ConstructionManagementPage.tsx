import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../components/common/DataTable';
import { FilterPanel, type FilterConfig } from '../../components/common/FilterPanel';
import { urbanObjectApiService } from '../../services/urbanObjectApiService';
import type { UrbanObjectResponse } from '../../types/urbanObject.api.types';
import { useAuthStore } from '../../store/authStore';
import { useMapStore } from '../../store/mapStore';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useObjectTypes } from '../../hooks/useObjectTypes';
import toast from 'react-hot-toast';

interface FilterState {
  type: string;
  status: string;
  search: string;
}

export const ConstructionManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { setPendingObjectSelection, setPendingAddObject } = useMapStore();
  const { data: objectTypes = [], loading: typesLoading } = useObjectTypes();
  const [objects, setObjects] = useState<UrbanObjectResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    type: '',
    status: '',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedObject, setSelectedObject] = useState<UrbanObjectResponse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
    status: 'active',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await urbanObjectApiService.getAll({
        page: page + 1,
        limit: rowsPerPage,
        search: filters.search || undefined,
        type: filters.type || undefined,
        status: filters.status as 'active' | 'inactive' | 'archived' || undefined,
      });
      setObjects(result.data);
      setTotal(result.total);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Lỗi khi tải dữ liệu');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const handleSearchSubmit = () => {
    setFilters({ ...filters, search: searchInput });
    setPage(0);
  };

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters({ ...filters, [filterName]: value });
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({ type: '', status: '', search: '' });
    setSearchInput('');
    setPage(0);
  };

  const handleAddClick = () => {
    setPendingAddObject(true);
    navigate('/map');
  };

  const handleEditClick = (obj: UrbanObjectResponse) => {
    setPendingObjectSelection({ objectId: obj.id, mode: 'edit' });
    navigate('/map');
  };

  const handleDeleteClick = (obj: UrbanObjectResponse) => {
    setSelectedObject(obj);
    setDeleteDialogOpen(true);
  };

  const handleViewClick = (obj: UrbanObjectResponse) => {
    setPendingObjectSelection({ objectId: obj.id, mode: 'view' });
    navigate('/map');
  };

  const handleFormChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleAddSubmit = async () => {
    if (!formData.name || !formData.code || !formData.type) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      await urbanObjectApiService.create({
        code: formData.code,
        name: formData.name,
        typeId: formData.type,
        type: formData.type,
        status: formData.status.toLowerCase() as 'active' | 'inactive' | 'archived',
        description: formData.description || undefined,
        properties: {
          status: formData.status,
          description: formData.description,
        },
        lods: [
          {
            lodLevel: 0,
            enabled: true,
            geom: {
              type: 'Point',
              coordinates: [106.6297, 10.8231],
            },
          },
        ],
      });
      toast.success('Thêm đối tượng thành công');
      setAddDialogOpen(false);
      setFormData({
        name: '',
        code: '',
        type: '',
        status: 'active',
        description: '',
      });
      loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || 'Lỗi khi thêm đối tượng';
      toast.error(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
      console.error('Error creating object:', error);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedObject) return;

    setIsDeleting(true);
    try {
      await urbanObjectApiService.delete(selectedObject.id);
      toast.success('Xóa đối tượng thành công');
      setDeleteDialogOpen(false);
      setSelectedObject(null);
      loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || 'Lỗi khi xóa đối tượng';
      toast.error(errorMessage);
      console.error('Error deleting object:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeName = (typeCodeOrId: string): string => {
    let type = objectTypes.find((t) => t.value === typeCodeOrId);
    return type?.label || 'Không xác định';
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'archived':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'Đang hoạt động';
      case 'inactive':
        return 'Không hoạt động';
      case 'archived':
        return 'Lưu trữ';
      default:
        return status;
    }
  };

  const columns: Column<UrbanObjectResponse>[] = [
    {
      id: 'name',
      label: 'Tên',
      minWidth: 170,
    },
    {
      id: 'code',
      label: 'Mã',
      minWidth: 120,
    },
    {
      id: 'type_id',
      label: 'Loại',
      minWidth: 150,
      format: (_value, row: UrbanObjectResponse) => {
        const typeValue = row.type || row.typeId;
        return getTypeName(typeValue);
      },
    },
    {
      id: 'status',
      label: 'Trạng thái',
      align: 'center',
      minWidth: 140,
      format: (_value, row: UrbanObjectResponse) => {
        const status = row.status || row.properties?.status || 'active';
        return (
          <Chip
            label={getStatusLabel(status)}
            color={getStatusColor(status)}
            size="small"
          />
        );
      },
    },
    {
      id: 'actions',
      label: 'Thao tác',
      align: 'right',
      minWidth: 150,
      format: (_value, row: UrbanObjectResponse) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <Tooltip title="Xem chi tiết">
            <IconButton
              size="small"
              color="info"
              onClick={() => handleViewClick(row)}
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleEditClick(row)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xóa">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteClick(row)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const filterConfigs: FilterConfig[] = [
    {
      name: 'type',
      label: 'Loại đối tượng',
      value: filters.type,
      options: objectTypes,
    },
    {
      name: 'status',
      label: 'Trạng thái',
      value: filters.status,
      options: [
        { label: 'Đang hoạt động', value: 'active' },
        { label: 'Không hoạt động', value: 'inactive' },
        { label: 'Lưu trữ', value: 'archived' },
      ],
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4, overflow: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Quản lý công trình
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý tất cả các đối tượng đô thị trong hệ thống
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
          sx={{ mt: 1 }}
        >
          Thêm Đối tượng
        </Button>
      </Box>

      {/* Filter Panel */}
      <FilterPanel
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm đối tượng theo tên, mã hoặc loại..."
        onSearchChange={handleSearchChange}
        onSearch={handleSearchSubmit}
        filters={filterConfigs}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Summary and Add Button */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Tổng số: {total} đối tượng | Đang hoạt động: {objects.filter(o => o.status?.toLowerCase() === 'active' || o.properties?.status?.toLowerCase() === 'active').length}
        </Typography>
      </Box>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={objects}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        total={total}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        emptyMessage="Không tìm thấy đối tượng nào"
        getRowKey={(row) => row.id}
      />

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm Đối tượng Mới</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tên đối tượng"
                required
                value={formData.name}
                onChange={handleFormChange('name')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mã đối tượng"
                required
                value={formData.code}
                onChange={handleFormChange('code')}
                helperText="VD: BLD-001, RD-005, TR-034"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required disabled={typesLoading}>
                <InputLabel>Loại đối tượng</InputLabel>
                <Select
                  value={formData.type}
                  onChange={handleFormChange('type')}
                  label="Loại đối tượng"
                >
                  {objectTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={formData.status}
                  onChange={handleFormChange('status')}
                  label="Trạng thái"
                >
                  <MenuItem value="active">Đang hoạt động</MenuItem>
                  <MenuItem value="inactive">Không hoạt động</MenuItem>
                  <MenuItem value="archived">Lưu trữ</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mô tả"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleFormChange('description')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleAddSubmit} variant="contained" color="primary">
            Thêm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Xác nhận xóa"
        message="Bạn có chắc muốn xóa đối tượng này? Thao tác này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeleting}
        itemName={selectedObject?.name || selectedObject?.code}
      />
    </Container>
  );
};
