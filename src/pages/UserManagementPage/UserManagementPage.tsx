import {
  Add as AddIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Box, Button, Chip, Container, IconButton, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DataTable, type Column } from '../../components/common/DataTable';
import { FilterPanel, type FilterConfig } from '../../components/common/FilterPanel';
import { userManagementService } from '../../services/userManagementService';
import { useAuthStore } from '../../store/authStore';
import type { User, UserRole, UserStatus } from '../../types/user.types';

interface FilterState {
  role: string;
  status: string;
  search: string;
}

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    role: '',
    status: '',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await userManagementService.getUsers(
        {
          role: filters.role as UserRole | undefined,
          status: filters.status as UserStatus | undefined,
          search: filters.search || undefined,
        },
        {
          page: page + 1,
          limit: rowsPerPage,
        }
      );
      setUsers(result.data);
      setTotal(result.total);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu người dùng');
      console.error(error);
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

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters({ ...filters, [filterName]: value });
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({ role: '', status: '', search: '' });
    setSearchInput('');
    setPage(0);
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: searchInput });
    setPage(0);
  };

  const handleAddClick = () => {
    navigate('/users/new');
  };

  const handleEditClick = (user: User) => {
    navigate(`/users/${user.id}/edit`);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
      await userManagementService.updateUserStatus(user.id, newStatus);
      toast.success(
        newStatus === 'active' ? 'Đã kích hoạt người dùng' : 'Đã vô hiệu hóa người dùng'
      );
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await userManagementService.deleteUser(selectedUser.id);
      toast.success('Xóa người dùng thành công');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi xóa người dùng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'EDITOR':
        return 'Editor';
      case 'GUEST':
        return 'Guest';
      default:
        return role;
    }
  };

  const getRoleColor = (role: UserRole): 'error' | 'primary' | 'default' => {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'EDITOR':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status?: UserStatus): string => {
    switch (status) {
      case 'active':
        return 'Hoạt động';
      case 'inactive':
        return 'Không hoạt động';
      case 'suspended':
        return 'Bị đình chỉ';
      default:
        return 'Hoạt động';
    }
  };

  const getStatusColor = (status?: UserStatus): 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'suspended':
        return 'warning';
      default:
        return 'success';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: Column<User>[] = [
    {
      id: 'name',
      label: 'Họ và tên',
      minWidth: 150,
    },
    {
      id: 'email',
      label: 'Email',
      minWidth: 200,
    },
    {
      id: 'roleCode',
      label: 'Vai trò',
      align: 'center',
      minWidth: 120,
      format: (value: UserRole) => {
        return <Chip label={getRoleLabel(value)} color={getRoleColor(value)} size="small" />;
      },
    },
    {
      id: 'status',
      label: 'Trạng thái',
      align: 'center',
      minWidth: 120,
      format: (value: UserStatus | undefined) => (
        <Chip label={getStatusLabel(value)} color={getStatusColor(value)} size="small" />
      ),
    },
    {
      id: 'lastLogin',
      label: 'Đăng nhập cuối',
      minWidth: 150,
      format: (value) => (value ? formatDate(value) : 'Chưa đăng nhập'),
    },
    {
      id: 'actions',
      label: 'Thao tác',
      align: 'right',
      minWidth: 150,
      format: (_value, row: User) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <Tooltip title={row.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}>
            <IconButton
              size="small"
              color={row.status === 'active' ? 'warning' : 'success'}
              onClick={() => handleToggleStatus(row)}
              disabled={row.id === currentUser?.id}
            >
              {row.status === 'active' ? <BlockIcon /> : <CheckCircleIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <IconButton size="small" color="primary" onClick={() => handleEditClick(row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xóa">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteClick(row)}
              disabled={row.id === currentUser?.id}
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
      name: 'role',
      label: 'Vai trò',
      value: filters.role,
      options: [
        { label: 'Admin', value: 'ADMIN' },
        { label: 'Editor', value: 'EDITOR' },
      ],
    },
    {
      name: 'status',
      label: 'Trạng thái',
      value: filters.status,
      options: [
        { label: 'Hoạt động', value: 'active' },
        { label: 'Không hoạt động', value: 'inactive' },
        { label: 'Bị đình chỉ', value: 'suspended' },
      ],
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4, overflow: 'auto' }}>
      <Box
        sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Quản lý người dùng
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý tất cả người dùng và quyền truy cập hệ thống
          </Typography>
        </Box>
        {currentUser?.role === 'ADMIN' && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            sx={{ mt: 1 }}
          >
            Thêm Người Dùng
          </Button>
        )}
      </Box>

      {/* Filter Panel */}
      <FilterPanel
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm theo tên hoặc email..."
        onSearchChange={setSearchInput}
        onSearch={handleSearch}
        filters={filterConfigs}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Tổng số: {total} người dùng | Đang hoạt động:{' '}
          {users.filter((u) => u.status === 'active').length}
        </Typography>
      </Box>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        total={total}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        emptyMessage="Không tìm thấy người dùng nào"
        getRowKey={(row) => row.id}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Xác nhận xóa"
        message="Bạn có chắc muốn xóa người dùng này? Thao tác này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={isSubmitting}
        itemName={selectedUser?.name || selectedUser?.email}
      />
    </Container>
  );
};
