import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  AccountCircle,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { ROLE_LABELS } from '../../constants';
import { LoginDialog } from '../LoginDialog';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  onLoginClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton = false, onLoginClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  

  const handleLogout = () => {
    clearAuth();
  };

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      setLoginDialogOpen(true);
    }
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        {showMenuButton && isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Urban 3D Management
        </Typography>

        {isAuthenticated && user && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <AccountCircle sx={{ mr: 1 }} />
            <Box sx={{ display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="body2">{user.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {ROLE_LABELS[user.role]}
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAuthenticated ? (
            <Button
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              size={isMobile ? 'small' : 'medium'}
            >
              {!isMobile && 'Đăng xuất'}
            </Button>
          ) : (
            <>
              <Button
                color="inherit"
                startIcon={<LoginIcon />}
                onClick={handleLoginClick}
                size={isMobile ? 'small' : 'medium'}
              >
                {!isMobile && 'Đăng nhập'}
              </Button>
            </>
          )}
        </Box>
      </Toolbar>

      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
      />
    </AppBar>
  );
};
