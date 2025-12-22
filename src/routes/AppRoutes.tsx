import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MapViewPage } from '../pages/MapViewPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppLayout } from '../components/AppLayout';
import { useAuthStore } from '../store/authStore';

export const AppRoutes: React.FC = () => {
    const {user} = useAuthStore();
  
  return (
    <BrowserRouter>
      <AppLayout showSidebar={!!user}>
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<MapViewPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};
