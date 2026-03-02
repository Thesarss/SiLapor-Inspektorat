import { useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { setNotificationHandler } from '../api/client';
import { initializeNotificationOverride } from '../utils/notifications';

const NotificationInitializer: React.FC = () => {
  const notification = useNotification();

  useEffect(() => {
    // Set the global notification handler for API client
    setNotificationHandler({
      showError: notification.showError,
      showWarning: notification.showWarning,
      showRateLimit: notification.showRateLimit,
      showNetworkError: notification.showNetworkError,
      showAuthError: notification.showAuthError,
    });

    // Initialize notification override system
    initializeNotificationOverride();

    console.log('🔔 Notification system fully initialized');
  }, [notification]);

  return null; // This component doesn't render anything
};

export default NotificationInitializer;