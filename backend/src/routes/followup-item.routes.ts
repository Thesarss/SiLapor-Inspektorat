import { Router, Request, Response, NextFunction } from 'express';
import { FollowupItemModel, FollowupItemFileModel } from '../models/followup-item.model';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { ReportService } from '../services/report.service';
import { canAccessReport } from '../utils/role-helpers';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

export const followupItemRouter = Router();

// All routes require authentication
followupItemRouter.use(authMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/followup-items';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// GET /api/followup-items/report/:reportId - Get all followup items for a report
followupItemRouter.get('/report/:reportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;
    const user = (req as AuthRequest).user!;

    // Check if user has access to this report
    const report = await ReportService.getReportById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report tidak ditemukan'
      });
    }

    // Users can only view their own reports or assigned reports, admins can view all
    if (!canAccessReport(user.role, user.id, report)) {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak'
      });
    }

    const followupItems = await FollowupItemModel.getByReportId(reportId);

    res.json({
      success: true,
      data: followupItems
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/followup-items/:id - Get single followup item
followupItemRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;

    const followupItem = await FollowupItemModel.getById(id);
    if (!followupItem) {
      return res.status(404).json({
        success: false,
        error: 'Followup item tidak ditemukan'
      });
    }

    // Check access to the parent report
    const report = await ReportService.getReportById(followupItem.report_id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report tidak ditemukan'
      });
    }

    if (!canAccessReport(user.role, user.id, report)) {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak'
      });
    }

    res.json({
      success: true,
      data: followupItem
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/followup-items/:id/response - Update OPD response
followupItemRouter.put('/:id/response', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const user = (req as AuthRequest).user!;

    if (!response || !response.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Response is required'
      });
    }

    const followupItem = await FollowupItemModel.getById(id);
    if (!followupItem) {
      return res.status(404).json({
        success: false,
        error: 'Followup item tidak ditemukan'
      });
    }

    // Check if user is assigned to this report
    const report = await ReportService.getReportById(followupItem.report_id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report tidak ditemukan'
      });
    }

    if (!canAccessReport(user.role, user.id, { assigned_to: report.assigned_to, created_by: report.assigned_to })) {
      return res.status(403).json({
        success: false,
        error: 'Hanya user yang ditugaskan yang dapat memberikan response'
      });
    }

    const updatedItem = await FollowupItemModel.updateResponse(id, response, 'completed');

    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/followup-items/:id/approve - Approve followup item (admin only)
followupItemRouter.post('/:id/approve', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const followupItem = await FollowupItemModel.getById(id);
    if (!followupItem) {
      return res.status(404).json({
        success: false,
        error: 'Followup item tidak ditemukan'
      });
    }

    const updatedItem = await FollowupItemModel.updateStatus(id, 'approved');

    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/followup-items/:id/reject - Reject followup item (admin only)
followupItemRouter.post('/:id/reject', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Rejection notes are required'
      });
    }

    const followupItem = await FollowupItemModel.getById(id);
    if (!followupItem) {
      return res.status(404).json({
        success: false,
        error: 'Followup item tidak ditemukan'
      });
    }

    const updatedItem = await FollowupItemModel.updateStatus(id, 'rejected', notes);

    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/followup-items/:id/files - Upload file for followup item
followupItemRouter.post('/:id/files', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const followupItem = await FollowupItemModel.getById(id);
    if (!followupItem) {
      return res.status(404).json({
        success: false,
        error: 'Followup item tidak ditemukan'
      });
    }

    // Check access
    const report = await ReportService.getReportById(followupItem.report_id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report tidak ditemukan'
      });
    }

    if (!canAccessReport(user.role, user.id, { assigned_to: report.assigned_to, created_by: report.assigned_to })) {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak'
      });
    }

    const fileRecord = await FollowupItemFileModel.create({
      followup_item_id: id,
      original_name: file.originalname,
      stored_name: file.filename,
      file_path: file.path,
      file_size: file.size,
      uploaded_by: user.id
    });

    res.json({
      success: true,
      data: fileRecord
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/followup-items/:id/files - Get files for followup item
followupItemRouter.get('/:id/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;

    const followupItem = await FollowupItemModel.getById(id);
    if (!followupItem) {
      return res.status(404).json({
        success: false,
        error: 'Followup item tidak ditemukan'
      });
    }

    // Check access
    const report = await ReportService.getReportById(followupItem.report_id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report tidak ditemukan'
      });
    }

    if (!canAccessReport(user.role, user.id, report)) {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak'
      });
    }

    const files = await FollowupItemFileModel.getByFollowupItemId(id);

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/followup-items/files/download/:fileId - Download file
followupItemRouter.get('/files/download/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const user = (req as AuthRequest).user!;

    const file = await FollowupItemFileModel.getById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File tidak ditemukan'
      });
    }

    const followupItem = await FollowupItemModel.getById(file.followup_item_id);
    if (!followupItem) {
      return res.status(404).json({
        success: false,
        error: 'Followup item tidak ditemukan'
      });
    }

    // Check access
    const report = await ReportService.getReportById(followupItem.report_id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report tidak ditemukan'
      });
    }

    if (!canAccessReport(user.role, user.id, report)) {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak'
      });
    }

    // Check if file exists
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File tidak ditemukan di server'
      });
    }

    res.download(file.file_path, file.original_name);
  } catch (error) {
    next(error);
  }
});