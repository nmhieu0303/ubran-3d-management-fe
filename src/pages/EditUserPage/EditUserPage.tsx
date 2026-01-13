import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CircularProgress, Container } from '@mui/material';
import { UserFormPage } from '../UserFormPage';
import { userManagementService } from '../../services/userManagementService';
import type { User } from '../../types/user.types';
import toast from 'react-hot-toast';

export const EditUserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!id) return;
      try {
        const userData = await userManagementService.getUserById(id);
        setUser(userData);
      } catch (error) {
        toast.error('Không tìm thấy người dùng');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return <UserFormPage mode="edit" user={user || undefined} />;
};
