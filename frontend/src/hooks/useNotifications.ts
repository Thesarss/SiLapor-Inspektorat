import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export const useNotifications = () => {
  const { user, isInspektorat } = useAuth();
  const [adminPendingCount, setAdminPendingCount] = useState(0);
  const [userPendingCount, setUserPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchAdminPendingCount = useCallback(async () => {
    // Only Inspektorat needs notification counts
    if (!isInspektorat) return;
    
    setLoading(true);
    try {
      // Use the correct admin pending count endpoint
      const response = await apiClient.get('/follow-ups/admin/pending-count');
      setAdminPendingCount(response.data.data?.count || 0);
    } catch (error) {
      console.error('Failed to fetch admin pending count:', error);
      setAdminPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, [isInspektorat]);

  const refreshNotifications = useCallback(() => {
    // Only Inspektorat gets notifications
    if (isInspektorat) {
      fetchAdminPendingCount();
    }
  }, [isInspektorat, fetchAdminPendingCount]);

  useEffect(() => {
    // Only fetch if user is authenticated and is Inspektorat
    if (user && isInspektorat) {
      refreshNotifications();
    }
    
    // Auto refresh every 30 seconds for Inspektorat only
    const interval = setInterval(() => {
      if (user && isInspektorat) {
        refreshNotifications();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshNotifications, user, isInspektorat]);

  // Refresh notifications when user navigates to relevant pages
  useEffect(() => {
    const handleFocus = () => {
      if (user && isInspektorat) {
        refreshNotifications();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshNotifications, user, isInspektorat]);

  return {
    adminPendingCount,
    userPendingCount,
    loading,
    refreshNotifications
  };
};