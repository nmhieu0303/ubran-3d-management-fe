import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MapViewPage } from '../pages/MapViewPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ConstructionManagementPage } from '../pages/ConstructionManagementPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { ChangeHistoryPage } from '../pages/ChangeHistoryPage';
import { AddUserPage } from '../pages/AddUserPage';
import { EditUserPage } from '../pages/EditUserPage';

import { AppLayout } from '../components/AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuthStore } from '../store/authStore';

export const AppRoutes: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <AppLayout showSidebar={!!user}>
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<MapViewPage />} />
          <Route path="/editor" element={<ConstructionManagementPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/users/new" element={<AddUserPage />} />
          <Route path="/users/:id/edit" element={<EditUserPage />} />
          <Route
            path="/history"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <ChangeHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};
