import { Router, Request, Response, NextFunction } from 'express';
import { OPDStatisticsService } from '../services/opd-statistics.service';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

export const opdStatisticsRouter = Router();

// All routes require authentication
opdStatisticsRouter.use(authMiddleware);

// GET /api/opd-statistics/my - Get statistics for current user's OPD
opdStatisticsRouter.get('/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    
    if (!user.institution) {
      return res.status(400).json({
        success: false,
        error: 'User tidak memiliki institusi yang terdaftar'
      });
    }

    const statistics = await OPDStatisticsService.getOPDStatistics(user.institution);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/opd-statistics/all - Get statistics for all OPDs (admin only)
opdStatisticsRouter.get('/all', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statistics = await OPDStatisticsService.getAllOPDStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/opd-statistics/ranking - Get OPD ranking by completion rate (admin only)
opdStatisticsRouter.get('/ranking', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ranking = await OPDStatisticsService.getOPDRanking();

    res.json({
      success: true,
      data: ranking
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/opd-statistics/:institution - Get statistics for specific OPD (admin only)
opdStatisticsRouter.get('/:institution', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { institution } = req.params;
    const statistics = await OPDStatisticsService.getOPDStatistics(decodeURIComponent(institution));

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
});

export default opdStatisticsRouter;