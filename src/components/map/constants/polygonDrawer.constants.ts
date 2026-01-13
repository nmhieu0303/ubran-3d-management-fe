
export const DEFAULT_POLYGON_HEIGHT = 20; // meters
export const DEFAULT_Z_OFFSET = 0; // meters

export const HEIGHT_CONSTRAINTS = {
  MIN: 0,
  MAX: 1000,
  STEP: 1,
} as const;

export const Z_OFFSET_CONSTRAINTS = {
  MIN: -500,
  MAX: 500,
  STEP: 1,
} as const;

export const CAMERA_ANIMATION_DURATION = 1000; // ms

export const TILT_SENSITIVITY = {
  HEADING: 0.5,
  TILT: 0.3,
} as const;

export const UI_TEXT = {
  TITLE: '🗺️ Vẽ Đa Giác 3D',
  SAVE_BUTTON: 'Lưu Đa Giác',
  CANCEL_BUTTON: 'Hủy',
  UNDO_TOOLTIP: 'Hoàn tác (Ctrl+Z)',
  RESET_TOOLTIP: 'Đặt lại (Xóa tất cả)',
  DELETE_TOOLTIP: 'Xóa đa giác đã chọn',
  HEIGHT_LABEL: 'Chiều cao (m)',
  Z_OFFSET_LABEL: 'Độ cao nền (m)',
  Z_OFFSET_INFO: 'Độ cao nền để xếp chồng các đa giác theo chiều dọc',
  STATS_TITLE: 'Thống kê đa giác',
  MODE_ADD: 'Thêm điểm',
  MODE_SELECT: 'Chọn',
  MODE_PAN: 'Di chuyển',
  MODE_TILT: 'Xoay/Nghiêng',
} as const;
