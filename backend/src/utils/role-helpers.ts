import { UserRole } from '../types';

export const isAdmin = (role: UserRole): boolean => {
  return role === 'super_admin';
};

export const isSuperAdmin = (role: UserRole): boolean => {
  return role === 'super_admin';
};

export const isInspektorat = (role: UserRole): boolean => {
  return role === 'inspektorat';
};

export const isOPD = (role: UserRole): boolean => {
  return role === 'opd';
};

export const canManageUsers = (role: UserRole): boolean => {
  // Only super_admin can manage users
  return role === 'super_admin';
};

export const canCreateReports = (role: UserRole): boolean => {
  // Only inspektorat can create reports/findings for OPD
  return role === 'inspektorat';
};

export const canReviewReports = (role: UserRole): boolean => {
  // Only inspektorat can review reports from OPD
  return role === 'inspektorat';
};

export const canFillReports = (role: UserRole): boolean => {
  // Only OPD can fill reports created by inspektorat
  return role === 'opd';
};

export const canViewStatistics = (role: UserRole): boolean => {
  // Inspektorat can view statistics of all OPD progress
  return role === 'inspektorat';
};

export const canAccessReport = (userRole: UserRole, userId: string, report: { assigned_to: string; created_by: string }): boolean => {
  // Inspektorat can access all reports
  if (isInspektorat(userRole)) {
    return true;
  }
  
  // Super admin can access all reports for management purposes
  if (isSuperAdmin(userRole)) {
    return true;
  }
  
  // OPD users can only access reports assigned to them
  return report.assigned_to === userId;
};