import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Map as MapIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  HomeWork as HomeWorkIcon,
  AccountCircle,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROLE_LABELS } from '../../constants';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SIDEBAR_WIDTH = 256;
const COLLAPSED_WIDTH = 64;

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  collapsed = false,
  onToggleCollapse
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  const menuItems = [
    { text: 'Xem bản đồ 3D', icon: <MapIcon />, path: '/map', roles: ['guest', 'editor', 'admin'] },
    { text: 'Quản lý công trình', icon: <HomeWorkIcon />, path: '/editor', roles: ['editor', 'admin'] },
    { text: 'Quản lý người dùng', icon: <PeopleIcon />, path: '/admin/users', roles: ['admin'] },
    { text: 'Lịch sử thay đổi', icon: <HistoryIcon />, path: '/audit', roles: ['editor', 'admin'] },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || 'guest')
  );

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        width: isMobile ? SIDEBAR_WIDTH : (collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH),
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <Tooltip title={(collapsed && !isMobile) ? item.text : ""} placement="right">
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  minHeight: 48,
                  justifyContent: (collapsed && !isMobile) ? 'center' : 'initial',
                  px: (collapsed && !isMobile) ? 2.5 : 2,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.contrastText,
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: (collapsed && !isMobile) ? 0 : 56,
                    mr: (collapsed && !isMobile) ? 0 : 3,
                    justifyContent: 'center',
                    color: location.pathname === item.path ? theme.palette.primary.contrastText : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {(!collapsed || isMobile) && <ListItemText primary={item.text} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
      <Divider />

      <Box sx={{
        p: collapsed ? 1 : 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 64,
      }}>
        {!collapsed && isAuthenticated && user && (
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
        {!isMobile && onToggleCollapse && (
          <Tooltip title={collapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}>
            <IconButton
              onClick={onToggleCollapse}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                }
              }}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          position: 'relative',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          overflowX: 'hidden',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};
