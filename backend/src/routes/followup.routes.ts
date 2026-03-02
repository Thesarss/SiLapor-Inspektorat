import { Router, Request, Response, NextFunction } from 'express';
import { FollowUpService } from '../services/followup.service';
import { ApprovalService } from '../services/approval.service';
import { authMiddleware, requireAdmin, requireInspektorat, AuthRequest } from '../middleware/auth.middleware';

export const followUpRouter = Router();

// All routes require authentication
followUpRouter.use(authMiddleware);

// POST /api/follow-ups - Create new follow-up
followUpRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId, content } = req.body;
    const user = (req as AuthRequest).user!;

    if (!reportId || !content) {
      return res.status(400).json({
        success: false,
        error: 'reportId and content are required',
      });
    }

    const followUp = await FollowUpService.createFollowUp({
      reportId,
      userId: user.id,
      content,
    });

    res.status(201).json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/follow-ups/:id - Update follow-up
followUpRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const user = (req as AuthRequest).user!;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content is required',
      });
    }

    const followUp = await FollowUpService.updateFollowUp(id, { content });

    res.json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/follow-ups/report/:reportId - Get follow-up by report ID
followUpRouter.get('/report/:reportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;

    const followUp = await FollowUpService.getFollowUpByReportId(reportId);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found',
      });
    }

    res.json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/follow-ups/pending - Get all pending follow-ups (inspektorat & super_admin)
followUpRouter.get('/pending', requireInspektorat, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followUps = await ApprovalService.getPendingFollowUps();

    res.json({
      success: true,
      data: followUps,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/follow-ups/all-pending - Get all pending reviews (inspektorat & super_admin)
followUpRouter.get('/all-pending', requireInspektorat, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allReviews = await ApprovalService.getAllPendingReviews();

    res.json({
      success: true,
      data: allReviews,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/follow-ups/admin/pending-count - Get admin pending count (inspektorat & super_admin)
followUpRouter.get('/admin/pending-count', requireInspektorat, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await ApprovalService.getAdminPendingCount();

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/follow-ups/admin/pending-details - Get admin pending details (inspektorat & super_admin)
followUpRouter.get('/admin/pending-details', requireInspektorat, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const details = await ApprovalService.getAdminPendingDetails();

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/follow-ups/:id/approve - Approve follow-up (inspektorat & super_admin)
followUpRouter.post('/:id/approve', requireInspektorat, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = (req as AuthRequest).user!;

    const followUp = await ApprovalService.approveFollowUp(id, user.id, notes);

    res.json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/follow-ups/:id/reject - Reject follow-up (inspektorat & super_admin)
followUpRouter.post('/:id/reject', requireInspektorat, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = (req as AuthRequest).user!;

    if (!notes) {
      return res.status(400).json({
        success: false,
        error: 'Catatan penolakan wajib diisi',
      });
    }

    const followUp = await ApprovalService.rejectFollowUp(id, user.id, notes);

    res.json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
});
