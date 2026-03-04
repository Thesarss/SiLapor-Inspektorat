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
  onRemoveAll?: () => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ 
  notifications, 
  onRemove,
  onRemoveAll 
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<NotificationItem[]>([]);
  const [isClosing, setIsClosing] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  const handleRemove = useCallback((id: string) => {
    setIsClosing(prev => new Set(prev).add(id));
    setTimeout(() => {
      setVisibleNotifications(prev => prev.filter(n => n.id !== id));
      onRemove(id);
      setIsClosing(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300); // Wait for animation
  }, [onRemove]);

  const handleRemoveAll = useCallback(() => {
    if (onRemoveAll) {
      // Add closing animation to all
      const allIds = new Set(visibleNotifications.map(n => n.id));
      setIsClosing(allIds);
      
      setTimeout(() => {
        setVisibleNotifications([]);
        onRemoveAll();
        setIsClosing(new Set());
      }, 300);
    }
  }, [onRemoveAll, visibleNotifications]);

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
      {/* Close All Button - shown when there are multiple notifications */}
      {visibleNotifications.length > 1 && onRemoveAll && (
        <div className="notification-header-bar">
          <span className="notification-count">
            {visibleNotifications.length} notifikasi
          </span>
          <button
            className="notification-close-all"
            onClick={handleRemoveAll}
            title="Tutup semua notifikasi"
          >
            <span className="close-all-icon">🗑️</span>
            Tutup Semua
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="notification-list">
        {visibleNotifications.map(notification => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type} ${
              isClosing.has(notification.id) ? 'notification-closing' : ''
            }`}
          >
            <div className="notification-content">
              <div className="notification-header">
                <span className="notification-icon">
                  {getIcon(notification.type)}
                </span>
                <h4 className="notification-title">{notification.title}</h4>
                <button
                  className="notification-close"
                  onClick={() => handleRemove(notification.id)}
                  aria-label="Tutup notifikasi"
                  title="Tutup"
                >
                  ×
                </button>
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
            {!notification.persistent && notification.duration !== 0 && (
              <div className="notification-progress">
                <div 
                  className="notification-progress-bar"
                  style={{
                    animationDuration: `${notification.duration || 5000}ms`
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSystem;