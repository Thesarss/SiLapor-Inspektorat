import React, { useState, useEffect, useCallback } from 'react';
import '../styles/NotificationSystem.css';

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
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

interface NotificationSystemProps {
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, onRemove }) => {
  const [visibleNotifications, setVisibleNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  const handleRemove = useCallback((id: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
    setTimeout(() => onRemove(id), 300); // Wait for animation
  }, [onRemove]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    notifications.forEach(notification => {
      if (!notification.persistent && notification.duration !== 0) {
        const duration = notification.duration || 5000;
        const timer = setTimeout(() => {
          handleRemove(notification.id);
        }, duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, handleRemove]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="notification-system">
      {visibleNotifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <div className="notification-content">
            <div className="notification-header">
              <span className="notification-icon">
                {getIcon(notification.type)}
              </span>
              <h4 className="notification-title">{notification.title}</h4>
              {!notification.persistent && (
                <button
                  className="notification-close"
                  onClick={() => handleRemove(notification.id)}
                  aria-label="Close notification"
                >
                  ×
                </button>
              )}
            </div>
            <p className="notification-message">{notification.message}</p>
            {notification.actions && notification.actions.length > 0 && (
              <div className="notification-actions">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    className={`notification-action notification-action-${action.style || 'secondary'}`}
                    onClick={() => {
                      action.action();
                      if (!notification.persistent) {
                        handleRemove(notification.id);
                      }
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="notification-progress">
            <div 
              className="notification-progress-bar"
              style={{
                animationDuration: notification.persistent ? 'none' : `${notification.duration || 5000}ms`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;