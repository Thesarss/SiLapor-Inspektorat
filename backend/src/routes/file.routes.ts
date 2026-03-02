import { Router, Request, Response, NextFunction } from 'express';
import { FileService, upload } from '../services/file.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export const fileRouter = Router();

// All routes require authentication
fileRouter.use(authMiddleware);

// POST /api/files/upload/:followUpId - Upload file
fileRouter.post(
  '/upload/:followUpId',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { followUpId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
        });
      }

      const evidenceFile = await FileService.uploadFile(file, followUpId);

      res.status(201).json({
        success: true,
        data: evidenceFile,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/files/:id - Delete file
fileRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await FileService.deleteFile(id);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/files/follow-up/:followUpId - Get files by follow-up ID
fileRouter.get('/follow-up/:followUpId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { followUpId } = req.params;

    const files = await FileService.getFilesByFollowUp(followUpId);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/files/download/:id - Download file
fileRouter.get('/download/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const file = await FileService.getFileById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    res.download(file.file_path, file.original_name);
  } catch (error) {
    next(error);
  }
});

// POST /api/files/upload/report/:reportId - Upload file directly to report
fileRouter.post(
  '/upload/report/:reportId',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reportId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
        });
      }

      const evidenceFile = await FileService.uploadFileToReport(file, reportId);

      res.status(201).json({
        success: true,
        data: evidenceFile,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/files/report/:reportId - Get files by report ID
fileRouter.get('/report/:reportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;

    const files = await FileService.getFilesByReport(reportId);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
});
