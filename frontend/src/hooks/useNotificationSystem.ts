import { useState, useCallback } from 'react';
import { NotificationItem } from '../components/NotificationSystem';

export interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}

export const useNotificationSystem = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((options: NotificationOptions) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const notification: NotificationItem = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration: options.duration,
      persistent: options.persistent,
      actions: options.actions,
    };

    setNotifications(prev => [...prev, notification]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, message: string, options?: Partial<NotificationOptions>) => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration: 4000,
      ...options,
    });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, options?: Partial<NotificationOptions>) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 6000,
      ...options,
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, options?: Partial<NotificationOptions>) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration: 5000,
      ...options,
    });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, options?: Partial<NotificationOptions>) => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration: 4000,
      ...options,
    });
  }, [addNotification]);

  // Rate limit notification
  const showRateLimit = useCallback((retryAfter: number) => {
    return addNotification({
      type: 'warning',
      title: 'Terlalu Banyak Permintaan',
      message: `Anda telah mencapai batas permintaan. Silakan coba lagi dalam ${retryAfter} detik.`,
      duration: retryAfter * 1000,
      persistent: false,
      actions: [
        {
          label: 'Mengerti',
          action: () => {},
          style: 'secondary'
        }
      ]
    });
  }, [addNotification]);

  // Network error notification
  const showNetworkError = useCallback((retry?: () => void) => {
    return addNotification({
      type: 'error',
      title: 'Koneksi Bermasalah',
      message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      persistent: true,
      actions: retry ? [
        {
          label: 'Coba Lagi',
          action: retry,
          style: 'primary'
        },
        {
          label: 'Tutup',
          action: () => {},
          style: 'secondary'
        }
      ] : [
        {
          label: 'Tutup',
          action: () => {},
          style: 'secondary'
        }
      ]
    });
  }, [addNotification]);

  // Authentication error notification
  const showAuthError = useCallback((redirectToLogin?: () => void) => {
    return addNotification({
      type: 'error',
      title: 'Sesi Berakhir',
      message: 'Sesi Anda telah berakhir. Silakan login kembali.',
      persistent: true,
      actions: [
        {
          label: 'Login Kembali',
          action: redirectToLogin || (() => window.location.href = '/login'),
          style: 'primary'
        }
      ]
    });
  }, [addNotification]);

  // File upload notifications
  const showUploadSuccess = useCallback((fileName: string) => {
    return addNotification({
      type: 'success',
      title: 'Upload Berhasil',
      message: `File "${fileName}" berhasil diupload.`,
      duration: 3000,
    });
  }, [addNotification]);

  const showUploadError = useCallback((fileName: string, error: string) => {
    return addNotification({
      type: 'error',
      title: 'Upload Gagal',
      message: `File "${fileName}" gagal diupload: ${error}`,
      duration: 6000,
    });
  }, [addNotification]);

  // Form validation notification
  const showValidationError = useCallback((errors: string[]) => {
    return addNotification({
      type: 'error',
      title: 'Data Tidak Valid',
      message: errors.length === 1 ? errors[0] : `Terdapat ${errors.length} kesalahan dalam form.`,
      duration: 5000,
    });
  }, [addNotification]);

  // Save notifications
  const showSaveSuccess = useCallback((itemName?: string) => {
    return addNotification({
      type: 'success',
      title: 'Berhasil Disimpan',
      message: itemName ? `${itemName} berhasil disimpan.` : 'Data berhasil disimpan.',
      duration: 3000,
    });
  }, [addNotification]);

  const showSaveError = useCallback((error: string) => {
    return addNotification({
      type: 'error',
      title: 'Gagal Menyimpan',
      message: error,
      duration: 5000,
    });
  }, [addNotification]);

  // Delete notifications
  const showDeleteConfirm = useCallback((itemName: string, onConfirm: () => void) => {
    return addNotification({
      type: 'warning',
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus "${itemName}"? Tindakan ini tidak dapat dibatalkan.`,
      persistent: true,
      actions: [
        {
          label: 'Hapus',
          action: onConfirm,
          style: 'danger'
        },
        {
          label: 'Batal',
          action: () => {},
          style: 'secondary'
        }
      ]
    });
  }, [addNotification]);

  const showDeleteSuccess = useCallback((itemName?: string) => {
    return addNotification({
      type: 'success',
      title: 'Berhasil Dihapus',
      message: itemName ? `${itemName} berhasil dihapus.` : 'Data berhasil dihapus.',
      duration: 3000,
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showRateLimit,
    showNetworkError,
    showAuthError,
    showUploadSuccess,
    showUploadError,
    showValidationError,
    showSaveSuccess,
    showSaveError,
    showDeleteConfirm,
    showDeleteSuccess,
  };
};