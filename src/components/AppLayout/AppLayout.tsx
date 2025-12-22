import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import { LoginDialog } from '../LoginDialog';
import { useAuthStore } from '../../store/authStore';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, showSidebar = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {user} = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header
        onMenuClick={handleSidebarToggle}
        showMenuButton={showSidebar && isMobile && !!user}
        onLoginClick={() => setLoginDialogOpen(true)}
      />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showSidebar && user && (
          <Sidebar 
            open={sidebarOpen} 
            onClose={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleSidebarCollapse}
          />
        )}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {children}
        </Box>
      </Box>

      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
      />
    </Box>
  );
};
