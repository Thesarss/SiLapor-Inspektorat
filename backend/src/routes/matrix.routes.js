const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// const { authMiddleware } = require('../middleware/auth.middleware');
// const { UserModel } = require('../models/user.model');

const matrixRouter = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/matrix');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'matrix-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Format file harus Excel (.xlsx atau .xls)'));
    }
  }
});

// Simple middleware for testing
const simpleAuth = (req, res, next) => {
  // For now, just pass through
  req.user = { role: 'inspektorat', id: 'test-user' };
  next();
};

// GET /api/matrix/test - Test endpoint
matrixRouter.get('/test', simpleAuth, async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Matrix API is working - JavaScript version',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/institutions - Get available institutions
matrixRouter.get('/institutions', simpleAuth, async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role !== 'inspektorat' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat melihat daftar institusi'
      });
    }

    // Hardcoded institutions for now
    const institutions = [
      'Dinas Pendidikan',
      'Dinas Kesehatan', 
      'Dinas Perhubungan',
      'Dinas Pekerjaan Umum'
    ];
    
    res.json({
      success: true,
      data: institutions,
      count: institutions.length,
      note: 'Using hardcoded data'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/templates - Get templates (placeholder)
matrixRouter.get('/templates', simpleAuth, async (req, res, next) => {
  try {
    const user = req.user;
    
    if (user.role !== 'inspektorat' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mengakses template matrix'
      });
    }

    // Placeholder response
    res.json({
      success: true,
      data: [],
      message: 'Matrix templates feature coming soon'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/statistics - Get statistics (placeholder)
matrixRouter.get('/statistics', simpleAuth, async (req, res, next) => {
  try {
    const user = req.user;
    
    const stats = {
      total_templates: 0,
      published_templates: 0,
      draft_templates: 0,
      total_assignments: 0,
      pending_assignments: 0,
      submitted_assignments: 0,
      completed_assignments: 0
    };

    res.json({
      success: true,
      data: stats,
      message: 'Matrix statistics feature coming soon'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/matrix/upload-auto - Upload matrix dengan auto mapping
matrixRouter.post('/upload-auto', simpleAuth, upload.single('file'), async (req, res, next) => {
  try {
    const user = req.user;
    
    if (user.role !== 'inspektorat' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mengupload matrix'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File Excel wajib diupload'
      });
    }

    const { title, description, targetOPD, useAutoMapping } = req.body;

    if (!title || !targetOPD) {
      return res.status(400).json({
        success: false,
        error: 'Judul dan Target OPD wajib diisi'
      });
    }

    // Import MatrixParserService (dynamic import for ES modules)
    const { MatrixParserService } = await import('../services/matrix-parser.service.js');
    
    // Validate file
    const validation = MatrixParserService.validateMatrixFile(req.file.path);
    if (!validation.valid) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Parse matrix file
    const parseResult = await MatrixParserService.parseMatrixFile(req.file.path, useAutoMapping === 'true');
    
    if (!parseResult.success) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Gagal memproses file matrix',
        details: {
          errors: parseResult.errors,
          warnings: parseResult.warnings
        }
      });
    }

    // TODO: Save to database
    // For now, just return success with parsed data
    const matrixId = 'matrix-' + Date.now();
    
    res.json({
      success: true,
      message: `Matrix "${title}" berhasil diupload dan diproses`,
      data: {
        id: matrixId,
        title,
        description,
        targetOPD,
        originalFilename: req.file.originalname,
        totalItems: parseResult.totalItems,
        items: parseResult.items.slice(0, 5), // Preview first 5 items
        detectedHeaders: parseResult.detectedHeaders,
        warnings: parseResult.warnings,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    // Clean up uploaded file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// POST /api/matrix/upload - Upload matrix dengan manual mapping (fallback)
matrixRouter.post('/upload', simpleAuth, upload.single('file'), async (req, res, next) => {
  try {
    const user = req.user;
    
    if (user.role !== 'inspektorat' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mengupload matrix'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File Excel wajib diupload'
      });
    }

    const { title, description, targetOPD } = req.body;

    if (!title || !targetOPD) {
      return res.status(400).json({
        success: false,
        error: 'Judul dan Target OPD wajib diisi'
      });
    }

    // For manual mapping, return preview for user to map columns
    const { MatrixParserService } = await import('../services/matrix-parser.service.js');
    
    const validation = MatrixParserService.validateMatrixFile(req.file.path);
    if (!validation.valid) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const preview = await MatrixParserService.getMatrixPreview(req.file.path, 10);
    
    res.json({
      success: true,
      message: 'File berhasil diupload, silakan mapping kolom',
      data: {
        uploadId: path.basename(req.file.path, path.extname(req.file.path)),
        title,
        description,
        targetOPD,
        originalFilename: req.file.originalname,
        preview,
        needsMapping: true
      }
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// GET /api/matrix/reports - Get matrix reports
matrixRouter.get('/reports', simpleAuth, async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role !== 'inspektorat' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat melihat matrix reports'
      });
    }

    // TODO: Get from database
    // For now, return empty array
    const reports = [];
    
    res.json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/assignments - Get matrix assignments for OPD
matrixRouter.get('/assignments', simpleAuth, async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role !== 'opd') {
      return res.status(403).json({
        success: false,
        error: 'Hanya OPD yang dapat melihat assignments'
      });
    }

    // TODO: Get from database
    // For now, return empty array
    const assignments = [];
    
    res.json({
      success: true,
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { matrixRouter };