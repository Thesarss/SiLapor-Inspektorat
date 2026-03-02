import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useNotificationSystem } from '../hooks/useNotificationSystem';
import CustomPrompt from '../components/CustomPrompt';

interface PromptState {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

interface NotificationContextType {
  notifications: any[]; // Add notifications array
  showSuccess: (title: string, message: string, options?: any) => string;
  showError: (title: string, message: string, options?: any) => string;
  showWarning: (title: string, message: string, options?: any) => string;
  showInfo: (title: string, message: string, options?: any) => string;
  showRateLimit: (retryAfter: number) => string;
  showNetworkError: (retry?: () => void) => string;
  showAuthError: (redirectToLogin?: () => void) => string;
  showUploadSuccess: (fileName: string) => string;
  showUploadError: (fileName: string, error: string) => string;
  showValidationError: (errors: string[]) => string;
  showSaveSuccess: (itemName?: string) => string;
  showSaveError: (error: string) => string;
  showDeleteConfirm: (itemName: string, onConfirm: () => void) => string;
  showDeleteSuccess: (itemName?: string) => string;
  showPrompt: (title: string, message: string, placeholder?: string) => Promise<string | null>;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [promptState, setPromptState] = useState<PromptState>({
    isOpen: false,
    title: '',
    message: '',
    placeholder: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const {
    notifications,
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
  } = useNotificationSystem();

  const showPrompt = (title: string, message: string, placeholder?: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        title,
        message,
        placeholder,
        onConfirm: (value: string) => {
          setPromptState(prev => ({ ...prev, isOpen: false }));
          resolve(value);
        },
        onCancel: () => {
          setPromptState(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        }
      });
    });
  };

  const contextValue: NotificationContextType = {
    notifications,
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
    showPrompt,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <CustomPrompt
        isOpen={promptState.isOpen}
        title={promptState.title}
        message={promptState.message}
        placeholder={promptState.placeholder}
        onConfirm={promptState.onConfirm}
        onCancel={promptState.onCancel}
      />
    </NotificationContext.Provider>
  );
};