import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Card,
    CardContent,
    CircularProgress,
    FormControlLabel,
    Switch,
    IconButton,
    InputAdornment,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { User, CreateUserData, UpdateUserData } from '../../types/user.types';
import { userManagementService } from '../../services/userManagementService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { USER_ROLES } from '../../constants';

interface UserFormPageProps {
    mode: 'add' | 'edit';
    user?: User;
    onSuccess?: () => void;
}

export const UserFormPage: React.FC<UserFormPageProps> = ({ mode, user, onSuccess }) => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    const [formData, setFormData] = useState<CreateUserData | UpdateUserData>(
        mode === 'add'
            ? {
                email: '',
                name: '',
                role: undefined,
                password: '',
                status: 'active',
            }
            : {
                name: user?.name || '',
                role: user?.roleCode,
                status: user?.status || 'active',
            }
    );

    useEffect(() => {
        if (mode === 'edit' && !user) {
            toast.error('Không tìm thấy người dùng');
            navigate('/users');
        }
    }, [mode, user, navigate]);


    useEffect(() => {
        if (mode === 'edit' && user) {
            setFormData({
                name: user.name || '',
                role: user.roleCode,
                status: user.status || 'active',
            });
        }
    }, [user, mode]);

    const handleFormChange = (field: string) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
    ) => {
        setFormData({ ...formData, [field]: event.target.value });
    };

    const handleSubmit = async () => {
        try {
            if (mode === 'add') {
                const addData = formData as CreateUserData;
                if (!addData.email || !addData.name || !addData.password) {
                    toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
                    return;
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addData.email)) {
                    toast.error('Email không hợp lệ');
                    return;
                }

                if (addData.password.length < 6) {
                    toast.error('Mật khẩu phải có ít nhất 6 ký tự');
                    return;
                }

                if (addData.password !== confirmPassword) {
                    toast.error('Mật khẩu và xác nhận mật khẩu không khớp');
                    return;
                }

                setIsSaving(true);
                await userManagementService.createUser(addData);
                toast.success('Thêm người dùng thành công');
            } else {
                if (!user) return;

                const editData = formData as UpdateUserData;
                if (!editData.name) {
                    toast.error('Vui lòng điền tên người dùng');
                    return;
                }

                setIsSaving(true);
                await userManagementService.updateUser(user.id, editData);
                toast.success('Cập nhật người dùng thành công');
            }

            onSuccess?.();
            navigate('/users');
        } catch (error: any) {
            toast.error(error.message || `Lỗi khi ${mode === 'add' ? 'thêm' : 'cập nhật'} người dùng`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        navigate('/users');
    };

    const canChangePassword = (): boolean => {
        if (mode === 'add') return false;
        if (!currentUser || !user) return false;
        const currentRole = currentUser.roleCode || currentUser.role as string;
        if (currentRole === USER_ROLES.ADMIN) return true;
        if (currentUser.id === user.id && (currentRole === USER_ROLES.EDITOR || currentRole === USER_ROLES.ADMIN)) {
            return true;
        }
        return false;
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmNewPassword) {
            toast.error('Vui lòng điền đầy đủ mật khẩu');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp');
            return;
        }

        setIsChangingPassword(true);
        try {
            await userManagementService.updateUser(user!.id, { password: newPassword });
            toast.success('Đổi mật khẩu thành công');
            setNewPassword('');
            setConfirmNewPassword('');
            setShowPasswordSection(false);
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi đổi mật khẩu');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const pageTitle = mode === 'add' ? 'Thêm Người Dùng Mới' : 'Chỉnh Sửa Người Dùng';
    const pageSubtitle =
        mode === 'add'
            ? 'Tạo một tài khoản người dùng mới trong hệ thống'
            : 'Cập nhật thông tin người dùng';

    return (
        <Container maxWidth="md" sx={{ py: 4, overflow: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleCancel}
                    sx={{ mb: 2 }}
                >
                    Quay lại
                </Button>
                <Typography variant="h4" component="h1" gutterBottom>
                    {pageTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {pageSubtitle}
                </Typography>
            </Box>

            <Card>
                <CardContent>
                    <Grid container spacing={3}>
                        {mode === 'add' && (
                            <>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        type="email"
                                        required
                                        value={(formData as CreateUserData).email || ''}
                                        onChange={handleFormChange('email')}
                                        placeholder="example@domain.com"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Họ và tên"
                                        required
                                        value={formData.name || ''}
                                        onChange={handleFormChange('name')}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Vai trò</InputLabel>
                                        <Select
                                            value={formData.role || 'guest'}
                                            onChange={handleFormChange('role')}
                                            label="Vai trò"
                                        >
                                            <MenuItem value="EDITOR">Editor</MenuItem>
                                            <MenuItem value="ADMIN">Admin</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                        Editor: Read & Edit • Admin: Full access
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Mật khẩu"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={(formData as CreateUserData).password || ''}
                                        onChange={handleFormChange('password')}
                                        helperText="Tối thiểu 6 ký tự"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="toggle password visibility"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                    >
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Xác nhận mật khẩu"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        helperText="Nhập lại mật khẩu để xác nhận"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="toggle password visibility"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        edge="end"
                                                    >
                                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                            </>
                        )}

                        {mode === 'edit' && (
                            <>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        value={user?.email || ''}
                                        disabled
                                        helperText="Email không thể thay đổi"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Họ và tên"
                                        required
                                        value={formData.name || ''}
                                        onChange={handleFormChange('name')}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Vai trò</InputLabel>
                                        <Select
                                            value={formData?.role || ''}
                                            onChange={handleFormChange('role')}
                                            label="Vai trò"
                                        >
                                            <MenuItem value={USER_ROLES.EDITOR}>Editor</MenuItem>
                                            <MenuItem value={USER_ROLES.ADMIN}>Admin</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                        Guest: Read only • Editor: Read & Edit • Admin: Full access
                                    </Typography>
                                </Grid>
                            </>
                        )}


                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={(formData as any).status === 'active'}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                status: e.target.checked ? 'active' : 'inactive',
                                            })
                                        }
                                    />
                                }
                                label={
                                    (formData as any).status === 'active'
                                        ? 'Người dùng đang hoạt động'
                                        : 'Người dùng bị vô hiệu hóa'
                                }
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'flex-end' }}>
                        <Button
                            variant="outlined"
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={isSaving}
                        >
                            {isSaving ? <CircularProgress size={24} /> : mode === 'add' ? 'Thêm' : 'Lưu'}
                        </Button>
                    </Box>

                    {/* Password Change Section */}
                    {mode === 'edit' && canChangePassword() && (
                        <>
                            <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid #e0e0e0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">
                                        {currentUser?.id === user?.id ? 'Đổi mật khẩu của bạn' : `Đổi mật khẩu cho ${user?.name}`}
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => setShowPasswordSection(!showPasswordSection)}
                                    >
                                        {showPasswordSection ? 'Ẩn' : 'Hiển thị'}
                                    </Button>
                                </Box>

                                {showPasswordSection && (
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Mật khẩu mới"
                                                type={showNewPassword ? 'text' : 'password'}
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Tối thiểu 6 ký tự"
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                aria-label="toggle password visibility"
                                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                                edge="end"
                                                            >
                                                                {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Xác nhận mật khẩu mới"
                                                type={showConfirmNewPassword ? 'text' : 'password'}
                                                required
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                placeholder="Nhập lại mật khẩu mới"
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                aria-label="toggle password visibility"
                                                                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                                                edge="end"
                                                            >
                                                                {showConfirmNewPassword ? <VisibilityOff /> : <Visibility />}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => {
                                                        setNewPassword('');
                                                        setConfirmNewPassword('');
                                                        setShowPasswordSection(false);
                                                    }}
                                                    disabled={isChangingPassword}
                                                >
                                                    Hủy
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={handleChangePassword}
                                                    disabled={isChangingPassword}
                                                >
                                                    {isChangingPassword ? <CircularProgress size={24} /> : 'Đổi mật khẩu'}
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                )}
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

