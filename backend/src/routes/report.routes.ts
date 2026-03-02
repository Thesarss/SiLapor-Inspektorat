import { Router, Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { ReportModel } from '../models/report.model';
import { isAdmin, canAccessReport } from '../utils/role-helpers';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { ReportStatus } from '../types';

export const reportRouter = Router();

// All routes require authentication
reportRouter.use(authMiddleware);

// POST /api/reports - Create new report (admin only)
reportRouter.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, assignedUserId } = req.body;
    const user = (req as AuthRequest).user!;

    if (!title || !description || !assignedUserId) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and assignedUserId are required',
      });
    }

    const report = await ReportService.createReport({
      title,
      description,
      assignedUserId,
      createdBy: user.id,
    });

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports - Get all reports with optional filters
reportRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, assignedUserId, createdBy, search, institution, dateFrom, dateTo, nomorLHP } = req.query;

    const reports = await ReportService.getReports({
      status: status as ReportStatus | undefined,
      assignedUserId: assignedUserId as string | undefined,
      createdBy: createdBy as string | undefined,
      search: search as string | undefined,
      institution: institution as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      nomorLHP: nomorLHP as string | undefined,
    });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/filter-options - Get filter options (years, institutions, etc.)
reportRouter.get('/filter-options', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    
    // Get available years from reports
    const years = await ReportModel.getAvailableYears();
    
    // Get institutions with report counts
    let institutions: { name: string; count: number }[] = [];
    if (isAdmin(user.role)) {
      institutions = await ReportModel.getInstitutionsWithCounts();
    } else {
      // For regular users, only show their own institution
      if (user.institution) {
        const count = await ReportModel.getReportCountByInstitution(user.institution);
        institutions = [{ name: user.institution, count }];
      }
    }

    res.json({
      success: true,
      data: {
        years,
        institutions
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/institutions - Get list of institutions for filter
reportRouter.get('/institutions', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { UserModel } = await import('../models/user.model');
    const institutions = await UserModel.getInstitutions();

    res.json({
      success: true,
      data: institutions,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/nomor-lhp - Get list of nomor LHP for filter
reportRouter.get('/nomor-lhp', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nomorLHPList = await ReportModel.getNomorLHPList();
    res.json({
      success: true,
      data: nomorLHPList,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/search - Search reports (admin only)
reportRouter.get('/search', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, status } = req.query;

    const reports = await ReportService.searchReports(
      q as string || '',
      status as ReportStatus | undefined
    );

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/assigned - Get reports assigned to current user
reportRouter.get('/assigned', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    const reports = await ReportService.getReportsByUser(user.id);

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/pending - Get pending reports for admin review
reportRouter.get('/pending', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await ReportService.getPendingReports();

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/my - Get reports created by current user
reportRouter.get('/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    const reports = await ReportService.getReportsCreatedByUser(user.id);

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/my/pending-action - Get reports that need user action
reportRouter.get('/my/pending-action', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    
    // Get reports assigned to user that need action
    const { query } = await import('../config/database');
    const result = await query(`
      SELECT r.*, 
             COUNT(fi.id) as total_followup_items,
             COUNT(CASE WHEN fir.status IN ('pending', 'rejected') THEN 1 END) as pending_recommendations
      FROM reports r
      LEFT JOIN followup_items fi ON r.id = fi.report_id
      LEFT JOIN followup_item_recommendations fir ON fi.id = fir.followup_item_id
      WHERE r.assigned_to = ? 
        AND r.status IN ('pending', 'needs_revision')
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `, [user.id]);

    const reportsNeedingAction = result.rows.filter((report: any) => {
      // Report needs action if:
      // 1. Status is 'pending' and no followup items created yet
      // 2. Status is 'needs_revision' 
      // 3. Has pending or rejected recommendations
      return report.status === 'pending' || 
             report.status === 'needs_revision' || 
             report.pending_recommendations > 0;
    });

    res.json({
      success: true,
      data: reportsNeedingAction,
      count: reportsNeedingAction.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/:id/progress-detail - Get detailed progress for a report
reportRouter.get('/:id/progress-detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;

    // Get report first to check permissions
    const report = await ReportService.getReportById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report tidak ditemukan'
      });
    }

    // Check permissions
    if (!canAccessReport(user.role, user.id, report)) {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak'
      });
    }

    // Get detailed progress data
    const { query } = await import('../config/database');
    
    // Get report with user info
    const reportDetailResult = await query(`
      SELECT 
        r.*,
        assignee.name as assigned_to_name,
        assignee.institution as institution
      FROM reports r
      JOIN users assignee ON r.assigned_to = assignee.id
      WHERE r.id = ?
    `, [id]);

    if (reportDetailResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report tidak ditemukan'
      });
    }

    const reportDetail = reportDetailResult.rows[0];
    
    // Get followup items with recommendation counts
    const followupItemsResult = await query(`
      SELECT 
        fi.id,
        fi.temuan,
        fi.penyebab,
        fi.rekomendasi,
        fi.status,
        COUNT(fir.id) as recommendations_count,
        COUNT(CASE WHEN fir.status = 'approved' THEN 1 END) as approved_recommendations,
        COUNT(CASE WHEN fir.status = 'rejected' THEN 1 END) as rejected_recommendations,
        COUNT(CASE WHEN fir.status = 'submitted' THEN 1 END) as pending_recommendations,
        COALESCE(
          ROUND(
            (COUNT(CASE WHEN fir.status = 'approved' THEN 1 END) * 100.0) / 
            NULLIF(COUNT(fir.id), 0)
          ), 0
        ) as progress_percentage,
        (
          SELECT COUNT(*) 
          FROM followup_item_recommendation_files firf 
          JOIN followup_item_recommendations fir2 ON firf.followup_item_recommendation_id = fir2.id 
          WHERE fir2.followup_item_id = fi.id
        ) as files_count,
        MAX(fir.updated_at) as last_activity
      FROM followup_items fi
      LEFT JOIN followup_item_recommendations fir ON fi.id = fir.followup_item_id
      WHERE fi.report_id = ?
      GROUP BY fi.id, fi.temuan, fi.penyebab, fi.rekomendasi, fi.status
      ORDER BY fi.created_at ASC
    `, [id]);

    // Get overall progress
    const overallProgressResult = await query(`
      SELECT 
        COUNT(DISTINCT fi.id) as total_items,
        COUNT(DISTINCT CASE WHEN fi.status = 'approved' THEN fi.id END) as completed_items,
        COUNT(fir.id) as total_recommendations,
        COUNT(CASE WHEN fir.status = 'approved' THEN 1 END) as approved_recommendations,
        COUNT(CASE WHEN fir.status = 'rejected' THEN 1 END) as rejected_recommendations,
        COUNT(CASE WHEN fir.status = 'submitted' THEN 1 END) as pending_recommendations,
        (
          SELECT COUNT(*) 
          FROM followup_item_recommendation_files firf 
          JOIN followup_item_recommendations fir2 ON firf.followup_item_recommendation_id = fir2.id 
          JOIN followup_items fi2 ON fir2.followup_item_id = fi2.id
          WHERE fi2.report_id = ?
        ) as total_files
      FROM followup_items fi
      LEFT JOIN followup_item_recommendations fir ON fi.id = fir.followup_item_id
      WHERE fi.report_id = ?
    `, [id, id]);

    const overallProgress = overallProgressResult.rows[0];
    const progressPercentage = overallProgress.total_items > 0 
      ? Math.round((overallProgress.completed_items / overallProgress.total_items) * 100)
      : 0;

    const progressData = {
      report: {
        id: reportDetail.id,
        title: reportDetail.title,
        institution: reportDetail.institution,
        assigned_to_name: reportDetail.assigned_to_name,
        status: reportDetail.status,
        created_at: reportDetail.created_at
      },
      followup_items: followupItemsResult.rows,
      overall_progress: {
        ...overallProgress,
        progress_percentage: progressPercentage
      }
    };

    res.json({
      success: true,
      data: progressData
    });
  } catch (error) {
    next(error);
  }
});
reportRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;

    const report = await ReportService.getReportById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    // Users can only view their own reports or assigned reports, admins can view all
    if (!canAccessReport(user.role, user.id, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/:id/import-details - Get import details for a report
reportRouter.get('/:id/import-details', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;

    // Get report first to check permissions
    const report = await ReportService.getReportById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report tidak ditemukan'
      });
    }

    // Check permissions
    if (!canAccessReport(user.role, user.id, report)) {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak'
      });
    }

    // Get import details
    const { ImportedReportModel } = await import('../models/file-import.model');
    const importDetails = await ImportedReportModel.getByReportId(id);

    res.json({
      success: true,
      data: importDetails
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/user - Create new report by user (user submits report to admin)
reportRouter.post('/user', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description } = req.body;
    const user = (req as AuthRequest).user!;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required',
      });
    }

    const report = await ReportService.createUserReport({
      title,
      description,
      createdBy: user.id,
    });

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/:id/approve - Approve report (admin only)
reportRouter.post('/:id/approve', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const report = await ReportService.approveReport(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/:id/reject - Reject report (admin only)
reportRouter.post('/:id/reject', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const report = await ReportService.rejectReport(id, notes);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/:id/resubmit - Resubmit rejected report (user only)
reportRouter.post('/:id/resubmit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;
    
    const report = await ReportService.getReportById(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }
    
    // Only owner can resubmit
    if (report.created_by !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    
    // Only rejected reports can be resubmitted
    if (report.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        error: 'Only rejected reports can be resubmitted',
      });
    }
    
    const updatedReport = await ReportService.resubmitReport(id);

    res.json({
      success: true,
      data: updatedReport,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/reports/:id/recommendation - Add/update recommendation (admin only)
reportRouter.put('/:id/recommendation', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { recommendation } = req.body;

    if (!recommendation) {
      return res.status(400).json({
        success: false,
        error: 'Recommendation is required',
      });
    }

    const report = await ReportService.updateRecommendation(id, recommendation);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});
