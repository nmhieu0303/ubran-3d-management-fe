import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Vui lòng đăng nhập để tiếp tục
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Vui lòng click vào nút "Đăng nhập" ở header để truy cập trang này.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};