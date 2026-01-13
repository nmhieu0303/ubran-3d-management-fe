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
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  AccountCircle,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROLE_LABELS } from '../../constants';
import { LoginDialog } from '../LoginDialog';
import { ChangePasswordDialog } from '../ChangePasswordDialog';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  onLoginClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton = false, onLoginClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);


  const handleLogout = () => {
    clearAuth();
    navigate('/map');
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleChangePassword = () => {
    handleProfileClose();
    setChangePasswordDialogOpen(true);
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
            <IconButton
              onClick={handleProfileClick}
              color="inherit"
              sx={{ p: 0 }}
            >
              <AccountCircle />
            </IconButton>
            <Box sx={{ display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-start', ml: 1 }}>
              <Typography variant="body2">{user.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {ROLE_LABELS[user.roleCode || user.role]}
              </Typography>
            </Box>
          </Box>
        )}

        <Menu
          anchorEl={profileAnchorEl}
          open={Boolean(profileAnchorEl)}
          onClose={handleProfileClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem disabled>
            <Typography variant="body2">{user?.name}</Typography>
          </MenuItem>
          <MenuItem divider disabled>
            <Typography variant="caption">{user?.email}</Typography>
          </MenuItem>
          {(user?.role === 'EDITOR' || user?.role === 'ADMIN') && (
            <MenuItem onClick={handleChangePassword}>
              <LockIcon sx={{ mr: 1 }} fontSize="small" />
              Đổi mật khẩu
            </MenuItem>
          )}
        </Menu>

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

      {user && (
        <ChangePasswordDialog
          open={changePasswordDialogOpen}
          userName={user.name}
          onClose={() => setChangePasswordDialogOpen(false)}
        />
      )}
    </AppBar>
  );
};
