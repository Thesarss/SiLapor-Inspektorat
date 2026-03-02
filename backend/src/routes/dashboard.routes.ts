import { Router, Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { ReportFilters } from '../models/report.model';

export const dashboardRouter = Router();

// All routes require authentication
dashboardRouter.use(authMiddleware);

// GET /api/dashboard/admin - Get admin dashboard (admin only)
dashboardRouter.get('/admin', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, institution, status, search } = req.query;
    
    const filters = {
      ...(year && { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` }),
      ...(institution && { institution: institution as string }),
      ...(status && { status: status as any }),
      ...(search && { search: search as string })
    };

    const dashboard = await DashboardService.getAdminDashboard(filters);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/stats - Get dashboard stats (for testing)
dashboardRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    
    // Basic stats for testing
    const stats = {
      totalReports: 0,
      totalUsers: 0,
      totalInstitutions: 0,
      systemStatus: 'OK'
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/user - Get user dashboard
dashboardRouter.get('/user', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    const { year, status, search } = req.query;
    
    const filters = {
      ...(year && { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` }),
      ...(status && { status: status as any }),
      ...(search && { search: search as string })
    };

    const dashboard = await DashboardService.getUserDashboard(user.id, filters);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/analytics - Get admin analytics (admin only)
dashboardRouter.get('/analytics', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await AdminAnalyticsService.getAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/monthly-trend - Get monthly trend (admin only)
dashboardRouter.get('/monthly-trend', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trend = await AdminAnalyticsService.getMonthlyTrend();

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/top-opds - Get top performing OPDs (admin only)
dashboardRouter.get('/top-opds', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const topOPDs = await AdminAnalyticsService.getTopPerformingOPDs(limit);

    res.json({
      success: true,
      data: topOPDs,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/inspektorat-analytics - Get inspektorat-specific analytics
dashboardRouter.get('/inspektorat-analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    
    // Only inspektorat and super_admin can access this
    if (user.role !== 'inspektorat' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mengakses statistik ini'
      });
    }

    const analytics = await DashboardService.getInspektoratAnalytics(user.id);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/*
// Matrix endpoints - Temporarily disabled due to missing models

// GET /api/dashboard/matrix/test - Test matrix endpoint
dashboardRouter.get('/matrix/test', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      message: 'Matrix API is working via dashboard routes',
      user: req.user?.role
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/matrix/institutions - Get available institutions
dashboardRouter.get('/matrix/institutions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    if (user.role !== 'inspektorat' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat melihat daftar institusi'
      });
    }

    // Get institutions from users table
    const users = await UserModel.findAll();
    const institutions = new Set<string>();
    
    users.forEach(user => {
      if (user.role === 'opd' && user.institution) {
        institutions.add(user.institution);
      }
    });

    const institutionList = Array.from(institutions).sort();
    
    res.json({
      success: true,
      data: institutionList
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/matrix/templates - Get templates
dashboardRouter.get('/matrix/templates', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    
    if (user.role !== 'inspektorat' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mengakses template matrix'
      });
    }

    const templates = await MatrixTemplateModel.findAll({ created_by: user.id });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/dashboard/matrix/templates - Create new matrix template
dashboardRouter.post('/matrix/templates', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    
    if (user.role !== 'inspektorat' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat membuat template matrix'
      });
    }

    const { title, description, template_type, target_institution, due_date, fields } = req.body;

    // Create template
    const template = await MatrixTemplateModel.create({
      title,
      description,
      created_by: user.id,
      target_institution,
      template_type: template_type || 'evaluation',
      status: 'draft',
      due_date: due_date ? new Date(due_date) : undefined
    });

    // Create fields
    if (fields && Array.isArray(fields)) {
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        await MatrixFieldModel.create({
          template_id: template.id,
          field_name: field.field_name,
          field_type: field.field_type || 'text',
          field_options: field.field_options,
          is_required: field.is_required || false,
          field_order: i + 1,
          help_text: field.help_text
        });
      }
    }
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template matrix berhasil dibuat'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/matrix/statistics - Get matrix statistics
dashboardRouter.get('/matrix/statistics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    
    if (user.role === 'inspektorat' || user.role === 'super_admin') {
      // Statistics for Inspektorat (creators)
      const templates = await MatrixTemplateModel.findAll({ created_by: user.id });
      const assignments = await MatrixAssignmentModel.findByUserId(user.id, 'assigned_by');

      const statistics = {
        total_templates: templates.length,
        published_templates: templates.filter(t => t.status === 'published').length,
        draft_templates: templates.filter(t => t.status === 'draft').length,
        total_assignments: assignments.length,
        pending_assignments: assignments.filter((a: any) => a.status === 'pending').length,
        submitted_assignments: assignments.filter((a: any) => a.status === 'submitted').length,
        completed_assignments: assignments.filter((a: any) => a.status === 'approved').length
      };

      res.json({
        success: true,
        data: statistics
      });
    } else {
      // Statistics for OPD (assignees)
      const assignments = await MatrixAssignmentModel.findByUserId(user.id, 'assigned_to');

      const statistics = {
        total_assignments: assignments.length,
        pending_assignments: assignments.filter(a => a.status === 'pending').length,
        in_progress_assignments: assignments.filter(a => a.status === 'in_progress').length,
        submitted_assignments: assignments.filter(a => a.status === 'submitted').length,
        approved_assignments: assignments.filter(a => a.status === 'approved').length,
        rejected_assignments: assignments.filter(a => a.status === 'rejected').length
      };

      res.json({
        success: true,
        data: statistics
      });
    }
  } catch (error) {
    next(error);
  }
});

*/