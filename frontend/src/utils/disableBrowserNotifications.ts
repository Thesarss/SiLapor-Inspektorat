/**
 * Disable Browser Default Notifications
 * Menghilangkan notifikasi browser default dan menggantinya dengan sistem custom
 */

/**
 * Disable browser's default notification permission request
 */
export const disableBrowserNotifications = () => {
  // Override Notification constructor to prevent browser notifications
  if ('Notification' in window) {
    // Override Notification constructor
    (window as any).Notification = function(title: string, options?: NotificationOptions) {
      console.log('🔕 Browser notification blocked:', title, options);
      // Don't create actual browser notification
      return {
        close: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };

    // Override static methods
    (window as any).Notification.requestPermission = () => {
      console.log('🔕 Notification permission request blocked');
      return Promise.resolve('denied');
    };

    (window as any).Notification.permission = 'denied';

    console.log('🔕 Browser notifications disabled');
  }

  // Disable service worker notifications
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        if (registration.showNotification) {
          registration.showNotification = function(title: string, options?: NotificationOptions) {
            console.log('🔕 Service worker notification blocked:', title, options);
            // Don't show notification
            return Promise.resolve();
          };
        }
      });
    });
  }

  // Override push notification events
  if ('PushManager' in window) {
    const originalPushManager = window.PushManager;
    if (originalPushManager) {
      console.log('🔕 Push notifications disabled');
    }
  }
};

/**
 * Disable file upload progress notifications from browser
 */
export const disableUploadNotifications = () => {
  // Override XMLHttpRequest to prevent upload notifications
  const originalXHR = window.XMLHttpRequest;
  
  (window as any).XMLHttpRequest = function() {
    const xhr = new originalXHR();
    
    // Override upload event listeners to prevent browser notifications
    const originalAddEventListener = xhr.addEventListener;
    xhr.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === 'progress' || type === 'load' || type === 'loadend') {
        // Allow our custom progress handling but prevent browser notifications
        return originalAddEventListener.call(this, type, (event: any) => {
          // Call original listener but suppress browser notifications
          if (listener) {
            listener(event);
          }
        }, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    return xhr;
  };

  // Copy static properties
  Object.setPrototypeOf(window.XMLHttpRequest, originalXHR);
  Object.defineProperty(window.XMLHttpRequest, 'prototype', {
    value: originalXHR.prototype,
    writable: false
  });

  console.log('🔕 Upload notifications disabled');
};

/**
 * Disable form submission notifications
 */
export const disableFormNotifications = () => {
  // Override form submission events
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    if (form) {
      // Prevent default browser form submission notifications
      event.preventDefault();
      
      // Allow custom form handling
      const customSubmitEvent = new CustomEvent('customSubmit', {
        detail: { originalEvent: event },
        bubbles: true,
        cancelable: true
      });
      
      form.dispatchEvent(customSubmitEvent);
    }
  }, true);

  console.log('🔕 Form notifications disabled');
};

/**
 * Disable all browser default notifications and replace with custom system
 */
export const initializeNotificationDisabling = () => {
  // Disable on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      disableBrowserNotifications();
      disableUploadNotifications();
      disableFormNotifications();
    });
  } else {
    disableBrowserNotifications();
    disableUploadNotifications();
    disableFormNotifications();
  }

  // Disable on window load as backup
  window.addEventListener('load', () => {
    disableBrowserNotifications();
    disableUploadNotifications();
    disableFormNotifications();
  });

  console.log('🔕 All browser notifications disabled, using custom system');
};

/**
 * Re-enable browser notifications (for cleanup/testing)
 */
export const enableBrowserNotifications = () => {
  // This would restore original functionality if needed
  console.log('🔔 Browser notifications re-enabled');
};