import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { EvidenceService } from '../services/evidence.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const evidenceRouter = Router();

// Configure multer for evidence file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/evidence');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF, gambar, atau dokumen yang diperbolehkan'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// POST /api/evidence/upload - Upload evidence file
evidenceRouter.post('/upload', authMiddleware, upload.single('evidence'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File evidence tidak ditemukan'
      });
    }

    const { matrix_item_id, description, category, priority, tags } = req.body;

    if (!matrix_item_id) {
      return res.status(400).json({
        success: false,
        error: 'Matrix item ID wajib diisi'
      });
    }

    // Parse tags if provided
    let parsedTags: string[] = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = [];
      }
    }

    const result = await EvidenceService.uploadEvidence(
      matrix_item_id,
      req.file,
      user.id,
      {
        description,
        category,
        priority,
        tags: parsedTags
      }
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Evidence berhasil diupload',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/evidence/search - Search evidence with filters
evidenceRouter.get('/search', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    const filters = {
      search: req.query.search as string,
      category: req.query.category as string,
      status: req.query.status as string,
      priority: req.query.priority as string,
      file_type: req.query.file_type as string,
      uploaded_by: req.query.uploaded_by as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sort_by: req.query.sort_by as string,
      sort_order: (req.query.sort_order as 'ASC' | 'DESC') || 'DESC'
    };

    const result = await EvidenceService.searchEvidence(filters, user.id, user.role);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/evidence/:id - Get evidence by ID
evidenceRouter.get('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    const result = await EvidenceService.getEvidenceById(id, user.id, user.role);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/evidence/:id/download - Download evidence file
evidenceRouter.get('/:id/download', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    const result = await EvidenceService.getEvidenceById(id, user.id, user.role);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Evidence tidak ditemukan'
      });
    }

    const evidence = result.data;

    // Check if file exists
    if (!fs.existsSync(evidence.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File evidence tidak ditemukan di server'
      });
    }

    // Send file
    res.download(evidence.file_path, evidence.original_filename);
  } catch (error) {
    next(error);
  }
});

// PUT /api/evidence/:id/review - Review evidence (Inspektorat only)
evidenceRouter.put('/:id/review', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, review_notes } = req.body;
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mereview evidence'
      });
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status harus approved atau rejected'
      });
    }

    const result = await EvidenceService.reviewEvidence(id, user.id, status, review_notes);

    if (result.success) {
      res.json({
        success: true,
        message: `Evidence berhasil di-${status === 'approved' ? 'approve' : 'reject'}`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/evidence/categories - Get evidence categories
evidenceRouter.get('/meta/categories', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    const result = await EvidenceService.getCategories();

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/evidence/tags - Get evidence tags
evidenceRouter.get('/meta/tags', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    const result = await EvidenceService.getTags();

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});