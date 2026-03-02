import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { MetricsService } from '../services/metrics.service';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

export const metricsRouter = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Allow PDF, Excel, CSV, images
    const allowedMimes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// All routes require authentication
metricsRouter.use(authMiddleware);

// GET /api/metrics/categories - Get all findings categories
metricsRouter.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await MetricsService.getAllCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/metrics/report/:reportId - Get metrics for a report
metricsRouter.get('/report/:reportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;
    const metrics = await MetricsService.getMetricsByReport(reportId);
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/metrics/report/:reportId/grouped - Get metrics grouped by category
metricsRouter.get('/report/:reportId/grouped', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;
    const grouped = await MetricsService.getMetricsGroupedByCategory(reportId);
    res.json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/metrics/report/:reportId/statistics - Get metrics statistics
metricsRouter.get('/report/:reportId/statistics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;
    const stats = await MetricsService.getMetricsStatistics(reportId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/metrics/upload - Upload metric file (admin only)
metricsRouter.post(
  '/upload',
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { reportId, categoryId, title, description, findingNumber, severity } = req.body;

      if (!reportId || !categoryId || !title) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const user = (req as AuthRequest).user!;
      const metric = await MetricsService.uploadMetric(
        reportId,
        categoryId,
        title,
        description || '',
        findingNumber || '',
        severity || 'medium',
        req.file,
        user.id
      );

      res.json({
        success: true,
        data: metric,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/metrics/:metricId/status - Update metric status (admin only)
metricsRouter.put(
  '/:metricId/status',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { metricId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const metric = await MetricsService.updateMetricStatus(metricId, status);
      res.json({
        success: true,
        data: metric,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/metrics/:metricId - Delete metric (admin only)
metricsRouter.delete('/:metricId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { metricId } = req.params;
    const success = await MetricsService.deleteMetric(metricId);
    res.json({
      success,
      message: success ? 'Metric deleted successfully' : 'Metric not found',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/metrics/:metricId/download - Download metric file
metricsRouter.get('/:metricId/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { metricId } = req.params;
    const file = await MetricsService.downloadMetricFile(metricId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(file.filePath, file.fileName);
  } catch (error) {
    next(error);
  }
});
