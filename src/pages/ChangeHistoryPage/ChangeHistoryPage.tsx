import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Divider,
  Paper,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { DataTable, type Column } from '../../components/common/DataTable';
import { FilterPanel, type FilterConfig } from '../../components/common/FilterPanel';
import { auditLogService } from '../../services/auditLogService';
import type { AuditLogEntry, AuditAction } from '../../types/audit.types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface FilterState {
  action: string;
  targetTable: string;
  search: string;
}

export const ChangeHistoryPage: React.FC = () => {
  const [changes, setChanges] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    action: '',
    targetTable: '',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (filters.action) {
        params.action = filters.action;
      }
      if (filters.targetTable) {
        params.targetTable = filters.targetTable;
      }

      const result = await auditLogService.getAuditLogs(params);
      setChanges(result.data);
      setTotal(result.total);
    } catch (error) {
      toast.error('Lỗi khi tải lịch sử thay đổi');
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
    setFilters({ action: '', targetTable: '', search: '' });
    setSearchInput('');
    setPage(0);
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: searchInput });
    setPage(0);
  };

  const handleViewDetails = (change: AuditLogEntry) => {
    setSelectedChange(change);
    setDetailDialogOpen(true);
  };

  const getTargetTableLabel = (table: string): string => {
    const labels: Record<string, string> = {
      users: 'Người dùng',
      urban_objects: 'Công trình đô thị',
      assets: 'Tài sản',
    };
    return labels[table] || table;
  };

  const getTargetTableColor = (table: string): 'primary' | 'secondary' | 'info' | 'success' => {
    switch (table) {
      case 'urban_objects':
        return 'primary';
      case 'users':
        return 'secondary';
      case 'assets':
        return 'info';
      default:
        return 'primary';
    }
  };

  const getActionLabel = (action: AuditAction): string => {
    const labels: Record<AuditAction, string> = {
      CREATE: 'Tạo mới',
      UPDATE: 'Cập nhật',
      DELETE: 'Xóa',
      VIEW: 'Xem',
      EXPORT: 'Xuất',
      IMPORT: 'Nhập',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: AuditAction): 'success' | 'info' | 'error' | 'warning' | 'default' => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'info';
      case 'DELETE':
        return 'error';
      case 'VIEW':
        return 'default';
      case 'EXPORT':
      case 'IMPORT':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss');
  };

  const columns: Column<AuditLogEntry>[] = [
    {
      id: 'createdAt',
      label: 'Thời gian',
      minWidth: 150,
      format: (value: string) => formatDate(value),
    },
    {
      id: 'action',
      label: 'Hành động',
      align: 'center',
      minWidth: 120,
      format: (value: AuditAction) => (
        <Chip
          label={getActionLabel(value)}
          color={getActionColor(value)}
          size="small"
        />
      ),
    },
    {
      id: 'targetTable',
      label: 'Loại đối tượng',
      align: 'center',
      minWidth: 150,
      format: (value: string) => (
        <Chip
          label={getTargetTableLabel(value)}
          color={getTargetTableColor(value)}
          size="small"
        />
      ),
    },
    {
      id: 'targetId',
      label: 'Đối tượng (ID)',
      minWidth: 200,
      format: (value: string) => (
        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
          {value}
        </Typography>
      ),
    },
    {
      id: 'user',
      label: 'Người thực hiện',
      minWidth: 180,
      format: (_value, row: AuditLogEntry) => (
        <Box>
          <Typography variant="body2">{row.user.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {row.user.email}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'endpoint',
      label: 'Endpoint',
      minWidth: 200,
      format: (value: string) => (
        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
          {value}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Chi tiết',
      align: 'center',
      minWidth: 80,
      format: (_value, row: AuditLogEntry) => (
        <Tooltip title="Xem chi tiết">
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewDetails(row)}
          >
            <ViewIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const filterConfigs: FilterConfig[] = [
    {
      name: 'targetTable',
      label: 'Loại đối tượng',
      value: filters.targetTable,
      options: [
        { label: 'Người dùng', value: 'users' },
        { label: 'Công trình đô thị', value: 'urban_objects' },
        { label: 'Tài sản', value: 'assets' },
      ],
    },
    {
      name: 'action',
      label: 'Hành động',
      value: filters.action,
      options: [
        { label: 'Tạo mới', value: 'CREATE' },
        { label: 'Cập nhật', value: 'UPDATE' },
        { label: 'Xóa', value: 'DELETE' },
        { label: 'Xem', value: 'VIEW' },
        { label: 'Xuất', value: 'EXPORT' },
        { label: 'Nhập', value: 'IMPORT' },
      ],
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Lịch sử thay đổi
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Theo dõi các thay đổi của quản lý người dùng và quản lý công trình
        </Typography>
      </Box>

      {/* Filter Panel */}
      <FilterPanel
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm..."
        onSearchChange={setSearchInput}
        onSearch={handleSearch}
        filters={filterConfigs}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Tổng số: {total} thay đổi
        </Typography>
      </Box>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={changes}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        total={total}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        emptyMessage="Không có lịch sử thay đổi"
        getRowKey={(row) => row.id}
      />

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chi tiết Log</DialogTitle>
        <DialogContent>
          {selectedChange && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ID:
                </Typography>
                <Typography variant="body2">{selectedChange.id}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Thời gian:
                </Typography>
                <Typography variant="body2">
                  {formatDate(selectedChange.createdAt)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Người thực hiện:
                </Typography>
                <Typography variant="body2">
                  {selectedChange.user.name} ({selectedChange.user.email})
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Hành động:
                </Typography>
                <Chip
                  label={getActionLabel(selectedChange.action)}
                  color={getActionColor(selectedChange.action)}
                  size="small"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Loại đối tượng:
                </Typography>
                <Chip
                  label={getTargetTableLabel(selectedChange.targetTable)}
                  color={getTargetTableColor(selectedChange.targetTable)}
                  size="small"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ID đối tượng:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedChange.targetId}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Endpoint:
                </Typography>
                <Typography variant="body2">{selectedChange.endpoint}</Typography>
              </Box>

              {selectedChange.statusCode && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Status Code:
                  </Typography>
                  <Typography variant="body2">{selectedChange.statusCode}</Typography>
                </Box>
              )}

              {selectedChange.oldData && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Dữ liệu cũ:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                        {JSON.stringify(selectedChange.oldData, null, 2)}
                      </pre>
                    </Paper>
                  </Box>
                </>
              )}

              {selectedChange.newData && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Dữ liệu mới:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: 'grey.50',
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                      {JSON.stringify(selectedChange.newData, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}

              {selectedChange.urbanObjectId && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Urban Object ID:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedChange.urbanObjectId}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
