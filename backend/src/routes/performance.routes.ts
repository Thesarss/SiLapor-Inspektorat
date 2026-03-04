import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { PerformanceService } from '../services/performance.service';
import { query } from '../config/database';
import { RowDataPacket } from 'mysql2';

export const performanceRouter = Router();

// Middleware to check admin access (allow inspektorat and super_admin)
const requireAdminAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  
  if (!user || (user.role !== 'super_admin' && user.role !== 'inspektorat')) {
    return res.status(403).json({
      success: false,
      error: 'Hanya Super Admin dan Inspektorat yang dapat mengakses performance dashboard'
    });
  }
  
  next();
};

// GET /api/performance/dashboard - Get performance dashboard data
performanceRouter.get('/dashboard', authMiddleware, requireAdminAccess, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await PerformanceService.getPerformanceDashboard();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/performance/activity-logs - Get user activity logs
performanceRouter.get('/activity-logs', authMiddleware, requireAdminAccess, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filters = {
      user_id: req.query.user_id as string,
      action: req.query.action as string,
      resource_type: req.query.resource_type as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50
    };
    
    const result = await PerformanceService.getUserActivityLogs(filters);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/performance/metrics-history - Get system metrics history
performanceRouter.get('/metrics-history', authMiddleware, requireAdminAccess, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const metricType = req.query.metric_type as string;
    const component = req.query.component as string;
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
    
    const result = await PerformanceService.getSystemMetricsHistory(metricType, component, hours);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/performance/record-metrics - Manually record system metrics
performanceRouter.post('/record-metrics', authMiddleware, requireAdminAccess, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await PerformanceService.recordSystemMetrics();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'System metrics berhasil direkam'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/performance/system-health - Get current system health
performanceRouter.get('/system-health', authMiddleware, requireAdminAccess, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Record current metrics first
    await PerformanceService.recordSystemMetrics();
    
    // Then get dashboard data
    const result = await PerformanceService.getPerformanceDashboard();
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          system_health: result.data?.system_health || [],
          last_updated: new Date()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/performance/system-stats - Get system statistics
performanceRouter.get('/system-stats', authMiddleware, requireAdminAccess, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get system statistics
    const [reportsResult, matrixResult, usersResult, assignmentsResult] = await Promise.all([
      query<RowDataPacket[]>('SELECT COUNT(*) as count FROM reports'),
      query<RowDataPacket[]>('SELECT COUNT(*) as count FROM matrix_reports'),
      query<RowDataPacket[]>('SELECT COUNT(*) as total, SUM(CASE WHEN role = "opd" THEN 1 ELSE 0 END) as opds, SUM(CASE WHEN role = "inspektorat" THEN 1 ELSE 0 END) as inspektorat FROM users'),
      query<RowDataPacket[]>('SELECT COUNT(*) as total, SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed FROM matrix_assignments')
    ]);

    const totalReports = reportsResult.rows[0]?.count || 0;
    const totalMatrixReports = matrixResult.rows[0]?.count || 0;
    const totalUsers = usersResult.rows[0]?.total || 0;
    const totalOPDs = usersResult.rows[0]?.opds || 0;
    const totalInspektorat = usersResult.rows[0]?.inspektorat || 0;
    const totalAssignments = assignmentsResult.rows[0]?.total || 0;
    const completedAssignments = assignmentsResult.rows[0]?.completed || 0;
    const activeAssignments = totalAssignments - completedAssignments;
    const overallCompletionRate = totalAssignments > 0 
      ? Math.round((completedAssignments / totalAssignments) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        totalReports,
        totalMatrixReports,
        totalOPDs,
        totalInspektorat,
        totalUsers,
        activeAssignments,
        completedAssignments,
        overallCompletionRate
      }
    });
  } catch (error) {
    next(error);
  }
});