// Enhanced notification utility with all required methods
export const notify = {
  success: (message: string) => {
    console.log('✅ Success:', message);
    // In production, this would integrate with a proper notification system
  },
  error: (title: string, message?: string) => {
    console.error('❌ Error:', title, message || '');
    // In production, this would integrate with a proper notification system
  },
  warning: (title: string, message?: string) => {
    console.warn('⚠️ Warning:', title, message || '');
    // In production, this would integrate with a proper notification system
  },
  info: (title: string, message?: string) => {
    console.info('ℹ️ Info:', title, message || '');
    // In production, this would integrate with a proper notification system
  },
  uploadSuccess: (fileName: string) => {
    console.log('📤 Upload Success:', fileName);
    // In production, this would integrate with a proper notification system
  },
  uploadError: (fileName: string, error: string) => {
    console.error('📤 Upload Error:', fileName, error);
    // In production, this would integrate with a proper notification system
  },
  deleteSuccess: (itemName: string) => {
    console.log('🗑️ Delete Success:', itemName);
    // In production, this would integrate with a proper notification system
  },
  confirm: (title: string, message: string, onConfirm: () => void) => {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  },
  prompt: (title: string, message: string, placeholder?: string): Promise<string | null> => {
    return Promise.resolve(window.prompt(`${title}\n\n${message}`, placeholder || ''));
  }
};

// Initialize notification override (placeholder)
export const initializeNotificationOverride = () => {
  console.log('📢 Notification system initialized');
  // In production, this would set up the notification system
};