import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { query } from '../config/database';
import { RowDataPacket } from 'mysql2';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export const matrixAuditRouter = Router();

// Configure multer for Excel file uploads
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
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel (.xlsx, .xls) yang diperbolehkan'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// GET /api/matrix/test - Test endpoint
matrixAuditRouter.get('/test', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      message: 'Matrix Audit API is working',
      timestamp: new Date().toISOString(),
      user: req.user?.name || 'Unknown'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/institutions - Get available institutions for matrix assignment
matrixAuditRouter.get('/institutions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat melihat daftar institusi'
      });
    }

    // Get institutions from existing users
    const result = await query<RowDataPacket[]>(`
      SELECT DISTINCT institution 
      FROM users 
      WHERE role = 'opd' AND institution IS NOT NULL 
      ORDER BY institution
    `);
    
    const institutions = result.rows.map(row => row.institution);
    
    res.json({
      success: true,
      data: institutions,
      count: institutions.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/reports - Get matrix reports (for Inspektorat)
matrixAuditRouter.get('/reports', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat melihat laporan matrix'
      });
    }

    let sql = 'SELECT * FROM matrix_reports';
    const params: any[] = [];

    if (user.role === 'inspektorat') {
      sql += ' WHERE uploaded_by = ?';
      params.push(user.id);
    }

    sql += ' ORDER BY created_at DESC';
    
    const result = await query<RowDataPacket[]>(sql, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/assignments - Get matrix assignments (for OPD)
matrixAuditRouter.get('/assignments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    const result = await query<RowDataPacket[]>(`
      SELECT 
        ma.*,
        mr.title,
        mr.description,
        mr.original_filename,
        mr.total_items,
        mr.completed_items,
        u.name as assigned_by_name
      FROM matrix_assignments ma
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_by = u.id
      WHERE ma.assigned_to = ?
      ORDER BY ma.assigned_at DESC
    `, [user.id]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/statistics - Get matrix statistics
matrixAuditRouter.get('/statistics', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    let stats = {};

    if (user.role === 'inspektorat' || user.role === 'super_admin') {
      // Statistics for Inspektorat - from matrix reports
      const [totalMatrix, totalItems, completedItems, submittedItems, pendingItems, opdStats] = await Promise.all([
        query<RowDataPacket[]>('SELECT COUNT(*) as count FROM matrix_reports WHERE uploaded_by = ?', [user.id]),
        query<RowDataPacket[]>('SELECT COUNT(*) as count FROM matrix_items mi JOIN matrix_reports mr ON mi.matrix_report_id = mr.id WHERE mr.uploaded_by = ?', [user.id]),
        query<RowDataPacket[]>('SELECT COUNT(*) as count FROM matrix_items mi JOIN matrix_reports mr ON mi.matrix_report_id = mr.id WHERE mr.uploaded_by = ? AND mi.status = ?', [user.id, 'approved']),
        query<RowDataPacket[]>('SELECT COUNT(*) as count FROM matrix_items mi JOIN matrix_reports mr ON mi.matrix_report_id = mr.id WHERE mr.uploaded_by = ? AND mi.status = ?', [user.id, 'submitted']),
        query<RowDataPacket[]>('SELECT COUNT(*) as count FROM matrix_items mi JOIN matrix_reports mr ON mi.matrix_report_id = mr.id WHERE mr.uploaded_by = ? AND mi.status = ?', [user.id, 'pending']),
        query<RowDataPacket[]>('SELECT COUNT(DISTINCT target_opd) as total_opds, COUNT(DISTINCT CASE WHEN completed_items > 0 THEN target_opd END) as active_opds FROM matrix_reports WHERE uploaded_by = ?', [user.id])
      ]);

      stats = {
        totalMatrix: totalMatrix.rows[0]?.count || 0,
        totalItems: totalItems.rows[0]?.count || 0,
        completedItems: completedItems.rows[0]?.count || 0,
        submittedItems: submittedItems.rows[0]?.count || 0,
        pendingItems: pendingItems.rows[0]?.count || 0,
        totalOPDs: opdStats.rows[0]?.total_opds || 0,
        activeOPDs: opdStats.rows[0]?.active_opds || 0
      };
    } else {
      // Statistics for OPD - from matrix assignments
      const [assignments, items] = await Promise.all([
        query<RowDataPacket[]>('SELECT COUNT(*) as count, ma.status FROM matrix_assignments ma WHERE assigned_to = ? GROUP BY ma.status', [user.id]),
        query<RowDataPacket[]>('SELECT COUNT(*) as count, mi.status FROM matrix_items mi JOIN matrix_assignments ma ON mi.matrix_report_id = ma.matrix_report_id WHERE ma.assigned_to = ? GROUP BY mi.status', [user.id])
      ]);

      const assignmentStats = assignments.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {});
      const itemStats = items.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {});

      stats = {
        totalMatrix: Object.values(assignmentStats).reduce((sum: number, val: any) => sum + parseInt(val), 0),
        totalItems: Object.values(itemStats).reduce((sum: number, val: any) => sum + parseInt(val), 0),
        completedItems: itemStats['approved'] || 0,
        submittedItems: itemStats['submitted'] || 0,
        pendingItems: itemStats['pending'] || 0,
        totalOPDs: 1,
        activeOPDs: 1
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/opd-performance - Get OPD performance statistics
matrixAuditRouter.get('/opd-performance', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat melihat performa OPD'
      });
    }

    // Get performance data for each OPD
    const performanceData = await query<RowDataPacket[]>(`
      SELECT 
        u.name as opd_name,
        u.institution,
        COUNT(DISTINCT ma.id) as total_assignments,
        COUNT(mi.id) as total_items,
        SUM(CASE WHEN mi.status = 'approved' THEN 1 ELSE 0 END) as completed_items,
        SUM(CASE WHEN mi.status = 'submitted' THEN 1 ELSE 0 END) as submitted_items,
        SUM(CASE WHEN mi.status = 'pending' THEN 1 ELSE 0 END) as pending_items,
        ROUND(
          (SUM(CASE WHEN mi.status = 'approved' THEN 1 ELSE 0 END) / COUNT(mi.id)) * 100, 
          2
        ) as completion_rate,
        COALESCE(
          AVG(DATEDIFF(mi.updated_at, ma.assigned_at)),
          0
        ) as avg_response_time
      FROM users u
      LEFT JOIN matrix_assignments ma ON ma.assigned_to = u.id
      LEFT JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      LEFT JOIN matrix_items mi ON mi.matrix_report_id = mr.id
      WHERE u.role = 'opd' 
        AND u.institution IS NOT NULL
        AND mr.uploaded_by = ?
      GROUP BY u.id, u.name, u.institution
      HAVING total_assignments > 0
      ORDER BY completion_rate DESC, u.institution
    `, [user.id]);

    res.json({
      success: true,
      data: performanceData.rows
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/matrix/upload-auto - Upload Excel file with automatic parsing
matrixAuditRouter.post('/upload-auto', authMiddleware, (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('🚀 UPLOAD-AUTO ENDPOINT HIT - Before multer');
  console.log('   User:', req.user?.name, '| Role:', req.user?.role);
  console.log('   Content-Type:', req.headers['content-type']);
  console.log('   Body keys:', Object.keys(req.body));
  
  upload.single('file')(req, res, (err) => {
    console.log('📦 Multer middleware callback');
    if (err) {
      console.error('❌ Multer error:', err.message);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          console.error('   Error type: File too large');
          return res.status(400).json({
            success: false,
            error: 'File terlalu besar. Maksimal 10MB'
          });
        }
        console.error('   Error type: Multer error -', err.code);
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`
        });
      }
      console.error('   Error type: General error');
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    console.log('✅ Multer processed successfully, calling next()');
    next();
  });
}, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    console.log('🔍 Matrix upload request:', {
      user: user?.name,
      role: user?.role,
      file: req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'NO FILE',
      body: req.body
    });
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      console.error('❌ Permission denied:', user?.role);
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mengupload matrix'
      });
    }

    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        error: 'File Excel tidak ditemukan'
      });
    }

    const { title, description, targetOPD, useAutoMapping } = req.body;
    
    console.log('📋 Form data:', { title, description, targetOPD, useAutoMapping });

    if (!title || !targetOPD) {
      console.error('❌ Missing required fields:', { title: !!title, targetOPD: !!targetOPD });
      return res.status(400).json({
        success: false,
        error: 'Title dan Target OPD wajib diisi'
      });
    }

    // Import MatrixParserService dynamically
    const { MatrixParserService } = await import('../services/matrix-parser.service');
    
    // Validate file
    const validation = MatrixParserService.validateMatrixFile(req.file.path);
    if (!validation.valid) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Parse matrix file with auto mapping
    const parseResult = await MatrixParserService.parseMatrixFile(req.file.path, useAutoMapping === 'true');
    
    if (!parseResult.success) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      console.error('❌ Parse failed:', parseResult.errors);
      console.error('   Detected headers:', parseResult.detectedHeaders);
      console.error('   Warnings:', parseResult.warnings);
      
      // Get the most relevant error message
      const mainError = parseResult.errors[0] || 'Gagal memproses file matrix';
      
      return res.status(400).json({
        success: false,
        error: mainError,
        details: {
          errors: parseResult.errors,
          warnings: parseResult.warnings,
          detectedHeaders: parseResult.detectedHeaders,
          hint: 'Pastikan file Excel memiliki kolom: Temuan, Penyebab (opsional), dan Rekomendasi'
        }
      });
    }

    // Create matrix report
    const reportId = uuidv4();
    await query(`
      INSERT INTO matrix_reports (
        id, title, description, uploaded_by, target_opd, 
        original_filename, file_path, status, total_items, completed_items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reportId, title, description, user.id, 
      targetOPD, req.file.originalname, req.file.path, 
      'active', parseResult.totalItems, 0
    ]);

    // Create matrix items from parsed data
    for (const item of parseResult.items) {
      const itemId = uuidv4();
      await query(`
        INSERT INTO matrix_items (
          id, matrix_report_id, item_number, temuan, penyebab, rekomendasi, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId, reportId, item.rowNumber, item.temuan, 
        item.penyebab, item.rekomendasi, 'pending'
      ]);
    }

    // Create assignment for target OPD users
    const usersResult = await query<RowDataPacket[]>('SELECT id FROM users WHERE role = ? AND institution = ?', ['opd', targetOPD]);
    const opdUsers = usersResult.rows;

    for (const opdUser of opdUsers) {
      const assignmentId = uuidv4();
      await query(`
        INSERT INTO matrix_assignments (
          id, matrix_report_id, assigned_to, assigned_by, status
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        assignmentId, reportId, opdUser.id, user.id, 'pending'
      ]);
    }

    res.json({
      success: true,
      message: `Matrix "${title}" berhasil diupload dan diproses otomatis`,
      data: {
        reportId,
        title,
        description,
        targetOPD,
        originalFilename: req.file.originalname,
        totalItems: parseResult.totalItems,
        itemsPreview: parseResult.items.slice(0, 5), // Preview first 5 items
        detectedHeaders: parseResult.detectedHeaders,
        warnings: parseResult.warnings,
        assignmentsCount: opdUsers.length,
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

// POST /api/matrix/upload - Upload Excel file with simple column order (Manual mode)
matrixAuditRouter.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    console.log('🚀 UPLOAD (MANUAL) ENDPOINT HIT');
    console.log('   User:', user?.name, '| Role:', user?.role);
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mengupload matrix'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File Excel tidak ditemukan'
      });
    }

    const { title, description, targetOPD } = req.body;

    if (!title || !targetOPD) {
      return res.status(400).json({
        success: false,
        error: 'Title dan Target OPD wajib diisi'
      });
    }

    // Import MatrixParserService
    const { MatrixParserService } = await import('../services/matrix-parser.service');
    
    // Validate file
    const validation = MatrixParserService.validateMatrixFile(req.file.path);
    if (!validation.valid) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Parse with simple mode (reads columns in order without header detection)
    const parseResult = await MatrixParserService.parseMatrixFileSimple(req.file.path);
    
    if (!parseResult.success) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      console.error('❌ Parse failed:', parseResult.errors);
      
      return res.status(400).json({
        success: false,
        error: parseResult.errors[0] || 'Gagal memproses file matrix',
        details: {
          errors: parseResult.errors,
          warnings: parseResult.warnings,
          hint: 'Mode manual: File harus memiliki kolom berurutan: Temuan, Penyebab, Rekomendasi (tanpa header atau header di baris pertama)'
        }
      });
    }

    // Create matrix report
    const reportId = uuidv4();
    await query(`
      INSERT INTO matrix_reports (
        id, title, description, uploaded_by, target_opd, 
        original_filename, file_path, status, total_items, completed_items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reportId, title, description, user.id, 
      targetOPD, req.file.originalname, req.file.path, 
      'active', parseResult.totalItems, 0
    ]);

    // Create matrix items
    for (const item of parseResult.items) {
      const itemId = uuidv4();
      await query(`
        INSERT INTO matrix_items (
          id, matrix_report_id, item_number, temuan, penyebab, rekomendasi, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId, reportId, item.rowNumber, item.temuan, 
        item.penyebab, item.rekomendasi, 'pending'
      ]);
    }

    // Create assignment for target OPD users
    const usersResult = await query<RowDataPacket[]>('SELECT id FROM users WHERE role = ? AND institution = ?', ['opd', targetOPD]);
    const opdUsers = usersResult.rows;

    for (const opdUser of opdUsers) {
      const assignmentId = uuidv4();
      await query(`
        INSERT INTO matrix_assignments (
          id, matrix_report_id, assigned_to, assigned_by, status
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        assignmentId, reportId, opdUser.id, user.id, 'pending'
      ]);
    }

    console.log('✅ Manual upload successful:', {
      reportId,
      totalItems: parseResult.totalItems,
      assignments: opdUsers.length
    });

    res.json({
      success: true,
      message: `Matrix "${title}" berhasil diupload (mode manual)`,
      data: {
        reportId,
        title,
        description,
        targetOPD,
        originalFilename: req.file.originalname,
        totalItems: parseResult.totalItems,
        itemsPreview: parseResult.items.slice(0, 5),
        warnings: parseResult.warnings,
        assignmentsCount: opdUsers.length,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// GET /api/matrix/evidence/metadata - Get metadata for evidence filters
matrixAuditRouter.get('/evidence/metadata', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mengakses metadata evidence'
      });
    }

    // Get unique matrix titles and target OPDs from matrix reports
    const [matrixTitlesResult, targetOPDsResult] = await Promise.all([
      query<RowDataPacket[]>('SELECT DISTINCT title FROM matrix_reports ORDER BY title'),
      query<RowDataPacket[]>('SELECT DISTINCT target_opd FROM matrix_reports ORDER BY target_opd')
    ]);

    const matrixTitles = matrixTitlesResult.rows.map(row => row.title);
    const targetOPDs = targetOPDsResult.rows.map(row => row.target_opd);

    res.json({
      success: true,
      data: {
        matrixTitles,
        targetOPDs
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/evidence/search - Search evidence from matrix items
matrixAuditRouter.get('/evidence/search', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mencari evidence'
      });
    }

    const {
      search = '',
      matrix_title = '',
      target_opd = '',
      status = '',
      uploaded_by = '',
      date_from = '',
      date_to = '',
      sort_by = 'uploaded_at',
      sort_order = 'DESC',
      page = '1',
      limit = '20'
    } = req.query;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];

    // Only show items with evidence
    conditions.push('mi.evidence_filename IS NOT NULL');
    conditions.push('mi.evidence_file_path IS NOT NULL');
    conditions.push('mi.status IN (?, ?, ?)');
    params.push('submitted', 'approved', 'rejected');

    if (search) {
      conditions.push('(mi.evidence_filename LIKE ? OR mi.temuan LIKE ? OR mi.rekomendasi LIKE ? OR mi.tindak_lanjut LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (matrix_title) {
      conditions.push('mr.title = ?');
      params.push(matrix_title);
    }

    if (target_opd) {
      conditions.push('mr.target_opd = ?');
      params.push(target_opd);
    }

    if (status) {
      conditions.push('mi.status = ?');
      params.push(status);
    }

    if (uploaded_by) {
      conditions.push('u.name LIKE ?');
      params.push(`%${uploaded_by}%`);
    }

    if (date_from) {
      conditions.push('DATE(mi.updated_at) >= ?');
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('DATE(mi.updated_at) <= ?');
      params.push(date_to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort parameters
    const validSortColumns = ['uploaded_at', 'evidence_filename', 'matrix_title', 'target_opd', 'status'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'uploaded_at';
    const sortDirection = sort_order === 'ASC' ? 'ASC' : 'DESC';

    // Map sort column to actual column name
    const sortColumnMap: Record<string, string> = {
      'uploaded_at': 'mi.updated_at',
      'evidence_filename': 'mi.evidence_filename',
      'matrix_title': 'mr.title',
      'target_opd': 'mr.target_opd',
      'status': 'mi.status'
    };

    const actualSortColumn = sortColumnMap[sortColumn as string] || 'mi.updated_at';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_to = u.id
      ${whereClause}
    `;

    const countResult = await query<RowDataPacket[]>(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;
    const pages = Math.ceil(total / limitNum);

    // Get evidence data
    const dataQuery = `
      SELECT 
        mi.id,
        mi.matrix_report_id,
        mr.title as matrix_title,
        mr.target_opd,
        mi.item_number,
        mi.temuan,
        mi.penyebab,
        mi.rekomendasi,
        mi.tindak_lanjut,
        mi.evidence_filename,
        mi.evidence_file_size,
        mi.evidence_file_path,
        mi.status,
        mi.updated_at as uploaded_at,
        u.name as uploaded_by_name,
        u.institution as uploader_institution,
        reviewer.name as reviewed_by_name,
        mi.reviewed_at,
        mi.review_notes
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_to = u.id
      LEFT JOIN users reviewer ON mi.reviewed_by = reviewer.id
      ${whereClause}
      ORDER BY ${actualSortColumn} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    const dataResult = await query<RowDataPacket[]>(dataQuery, [...params, limitNum, offset]);

    res.json({
      success: true,
      data: {
        evidence: dataResult.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/assignment/:assignmentId/items - Get matrix items for an assignment
matrixAuditRouter.get('/assignment/:assignmentId/items', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { assignmentId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    // Get assignment details
    const assignmentResult = await query<RowDataPacket[]>(`
      SELECT ma.*, mr.title, mr.description
      FROM matrix_assignments ma
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      WHERE ma.id = ? AND ma.assigned_to = ?
    `, [assignmentId, user.id]);

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment tidak ditemukan'
      });
    }

    const assignment = assignmentResult.rows[0];

    // Get matrix items
    const itemsResult = await query<RowDataPacket[]>(`
      SELECT * FROM matrix_items
      WHERE matrix_report_id = ?
      ORDER BY item_number ASC
    `, [assignment.matrix_report_id]);

    res.json({
      success: true,
      data: {
        assignment,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/matrix/item/:itemId/submit - Submit tindak lanjut for a matrix item
const evidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../uploads/matrix-evidence');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
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

matrixAuditRouter.post('/item/:itemId/submit', authMiddleware, evidenceUpload.single('evidence'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { itemId } = req.params;
    const { tindakLanjut } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    if (!tindakLanjut) {
      return res.status(400).json({
        success: false,
        error: 'Tindak lanjut wajib diisi'
      });
    }

    // Verify item exists and user has access
    const itemResult = await query<RowDataPacket[]>(`
      SELECT mi.*, ma.assigned_to
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
      WHERE mi.id = ? AND ma.assigned_to = ?
    `, [itemId, user.id]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item tidak ditemukan atau Anda tidak memiliki akses'
      });
    }

    // Update matrix item with tindak lanjut and evidence
    const updateData: any = {
      tindak_lanjut: tindakLanjut,
      status: 'submitted'
    };

    if (req.file) {
      updateData.evidence_filename = req.file.originalname;
      updateData.evidence_file_path = req.file.path;
      updateData.evidence_file_size = req.file.size;
    }

    const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const updateValues = Object.values(updateData);

    await query(`
      UPDATE matrix_items
      SET ${updateFields}
      WHERE id = ?
    `, [...updateValues, itemId]);

    // Update assignment status to in_progress if not already
    await query(`
      UPDATE matrix_assignments ma
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      JOIN matrix_items mi ON mi.matrix_report_id = mr.id
      SET ma.status = 'in_progress'
      WHERE mi.id = ? AND ma.assigned_to = ? AND ma.status = 'pending'
    `, [itemId, user.id]);

    // Check if all items are submitted, then mark assignment as completed
    const allItemsResult = await query<RowDataPacket[]>(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN mi.status IN ('submitted', 'approved') THEN 1 ELSE 0 END) as completed
      FROM matrix_items mi
      JOIN matrix_assignments ma ON ma.matrix_report_id = mi.matrix_report_id
      WHERE ma.assigned_to = ? AND mi.matrix_report_id = (
        SELECT matrix_report_id FROM matrix_items WHERE id = ?
      )
    `, [user.id, itemId]);

    const { total, completed } = allItemsResult.rows[0];
    if (total === completed) {
      await query(`
        UPDATE matrix_assignments ma
        JOIN matrix_items mi ON ma.matrix_report_id = mi.matrix_report_id
        SET ma.status = 'completed', ma.completed_at = NOW()
        WHERE mi.id = ? AND ma.assigned_to = ?
      `, [itemId, user.id]);
    }

    res.json({
      success: true,
      message: 'Tindak lanjut berhasil disubmit',
      data: {
        itemId,
        hasEvidence: !!req.file
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/item/:itemId/evidence - Download evidence file
matrixAuditRouter.get('/item/:itemId/evidence', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { itemId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    // Get item with evidence
    const itemResult = await query<RowDataPacket[]>(`
      SELECT mi.*
      FROM matrix_items mi
      WHERE mi.id = ?
    `, [itemId]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item tidak ditemukan'
      });
    }

    const item = itemResult.rows[0];

    if (!item.evidence_file_path) {
      return res.status(404).json({
        success: false,
        error: 'Evidence tidak ditemukan'
      });
    }

    // Check if file exists
    if (!fs.existsSync(item.evidence_file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File evidence tidak ditemukan di server'
      });
    }

    // Send file
    res.download(item.evidence_file_path, item.evidence_filename);
  } catch (error) {
    next(error);
  }
});

// POST /api/matrix/item/:itemId/review - Inspektorat review tindak lanjut
matrixAuditRouter.post('/item/:itemId/review', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { itemId } = req.params;
    const { status, reviewNotes } = req.body;
    
    console.log('🔍 Matrix Review Request:', { 
      itemId, 
      status, 
      reviewNotes, 
      userId: user?.id, 
      userRole: user?.role,
      userName: user?.name 
    });
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      console.error('❌ Permission denied:', user?.role);
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mereview'
      });
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      console.error('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        error: 'Status harus approved atau rejected'
      });
    }

    // Verify user exists in database (to avoid foreign key constraint error)
    const userCheck = await query<RowDataPacket[]>(`
      SELECT id, username, role FROM users WHERE id = ?
    `, [user.id]);
    
    if (!userCheck.rows || userCheck.rows.length === 0) {
      console.error('❌ User not found in database:', user.id);
      return res.status(401).json({
        success: false,
        error: 'User tidak valid. Silakan login ulang.'
      });
    }
    
    console.log('✅ User verified:', userCheck.rows[0]);

    // Check if item exists
    const checkResult = await query<RowDataPacket[]>(`
      SELECT id, status, matrix_report_id FROM matrix_items WHERE id = ?
    `, [itemId]);
    
    if (!checkResult.rows || checkResult.rows.length === 0) {
      console.error('❌ Matrix item not found:', itemId);
      return res.status(404).json({
        success: false,
        error: 'Matrix item tidak ditemukan'
      });
    }
    
    console.log('✅ Matrix item found:', checkResult.rows[0]);

    // Update item with review
    const updateResult = await query(`
      UPDATE matrix_items
      SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = NOW()
      WHERE id = ?
    `, [status, user.id, reviewNotes || null, itemId]);
    
    console.log('✅ Update successful:', { 
      rowCount: updateResult.rowCount,
      status,
      reviewedBy: user.id
    });

    res.json({
      success: true,
      message: `Item berhasil di-${status === 'approved' ? 'approve' : 'reject'}`,
      data: {
        itemId,
        status,
        reviewedBy: user.name
      }
    });
  } catch (error: any) {
    console.error('❌ Matrix review error:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
    
    // Handle specific database errors
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        error: 'User tidak valid. Silakan login ulang.'
      });
    }
    
    next(error);
  }
});
// POST /api/matrix/item/:itemId/evidence - Upload evidence for matrix item (OPD)
matrixAuditRouter.post('/item/:itemId/evidence', authMiddleware, evidenceUpload.single('evidence'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { itemId } = req.params;
    const { assignmentId, description, category, priority } = req.body;
    
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

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        error: 'Assignment ID wajib diisi'
      });
    }

    const { EvidenceService } = await import('../services/evidence.service');
    
    const result = await EvidenceService.uploadMatrixEvidence(
      itemId,
      assignmentId,
      req.file,
      user.id,
      {
        description,
        category,
        priority
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

// GET /api/matrix/progress - Get matrix progress for inspektorat
matrixAuditRouter.get('/progress', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat melihat progress matrix'
      });
    }

    const { EvidenceService } = await import('../services/evidence.service');
    
    const result = await EvidenceService.getMatrixProgress(user.id);

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

// GET /api/matrix/evidence-tracking - Get evidence tracking for matrix items
matrixAuditRouter.get('/evidence-tracking', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat melihat tracking evidence'
      });
    }

    const filters = {
      matrix_report_id: req.query.matrix_report_id as string,
      target_opd: req.query.target_opd as string,
      status: req.query.status as string
    };

    const { EvidenceService } = await import('../services/evidence.service');
    
    const result = await EvidenceService.getMatrixEvidenceTracking(user.id, filters);

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

// GET /api/matrix/assignment/:assignmentId/progress - Get detailed progress for an assignment
matrixAuditRouter.get('/assignment/:assignmentId/progress', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { assignmentId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    // Get assignment details with progress
    const assignmentResult = await query<RowDataPacket[]>(`
      SELECT 
        ma.*,
        mr.title as matrix_title,
        mr.description as matrix_description,
        mr.target_opd,
        u.name as opd_user_name,
        u.institution as opd_institution
      FROM matrix_assignments ma
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_to = u.id
      WHERE ma.id = ? AND (ma.assigned_to = ? OR mr.uploaded_by = ?)
    `, [assignmentId, user.id, user.id]);

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment tidak ditemukan atau Anda tidak memiliki akses'
      });
    }

    const assignment = assignmentResult.rows[0];

    // Get matrix items with evidence details
    const itemsResult = await query<RowDataPacket[]>(`
      SELECT 
        mi.*,
        COALESCE(
          (SELECT COUNT(*) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
          0
        ) as evidence_count,
        COALESCE(
          (SELECT GROUP_CONCAT(ef.original_filename SEPARATOR ', ') 
           FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
          NULL
        ) as evidence_files,
        COALESCE(
          (SELECT MAX(ef.uploaded_at) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
          NULL
        ) as last_evidence_upload
      FROM matrix_items mi
      WHERE mi.matrix_report_id = ?
      ORDER BY mi.item_number ASC
    `, [assignment.matrix_report_id]);

    res.json({
      success: true,
      data: {
        assignment,
        items: itemsResult.rows,
        summary: {
          total_items: itemsResult.rows.length,
          items_with_evidence: itemsResult.rows.filter(item => item.evidence_count > 0).length,
          completed_items: itemsResult.rows.filter(item => item.status === 'submitted' || item.status === 'approved').length,
          progress_percentage: assignment.progress_percentage || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});