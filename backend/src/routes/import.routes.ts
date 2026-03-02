import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, requireAdmin, requireInspektorat } from '../middleware/auth.middleware';
import { FileParserService } from '../services/file-parser.service';
import { FixedFormatParserService } from '../services/fixed-format-parser.service';
import { ColumnMappingService } from '../services/column-mapping.service';
import { DataValidationService } from '../services/data-validation.service';
import { ImportHistoryService } from '../services/import-history.service';
import { ImportExecutionService } from '../services/import-execution.service';
import { FileImportModel } from '../models/file-import.model';
import { PreviewData, ColumnMapping, FileType } from '../types';

const router = Router();

// Setup multer untuk file upload
const uploadDir = path.join(__dirname, '../../uploads/imports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];

    if (!allowedExtensions.includes(ext)) {
      cb(new Error('Format file harus Excel (.xlsx, .xls) atau CSV (.csv)'));
    } else {
      cb(null, true);
    }
  }
});

// Store temporary uploads in memory (in production, use database or cache)
const tempUploads = new Map<string, { filePath: string; fileType: string; fileName: string }>();

/**
 * GET /api/imports/institutions
 * Get available institutions for import targeting
 */
router.get('/institutions', authMiddleware, requireInspektorat, async (req: Request, res: Response) => {
  try {
    // Get institutions from users table or return default list
    const institutions = [
      'Dinas Pendidikan',
      'Dinas Kesehatan', 
      'Dinas Pekerjaan Umum',
      'Dinas Sosial',
      'Dinas Perhubungan',
      'Dinas Pariwisata',
      'Dinas Lingkungan Hidup',
      'Dinas Kependudukan',
      'Dinas Perindustrian',
      'Dinas Pertanian'
    ];
    
    res.json({
      success: true,
      data: institutions
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal ambil daftar institusi' });
  }
});

/**
 * POST /api/imports/upload-fixed-format
 * Upload file dengan format tetap (auto-detect dan auto-mapping)
 * Feature: file-import, Property 1: File format validation
 * Feature: file-import, Property 2: File size limit enforcement
 */
router.post('/upload-fixed-format', authMiddleware, requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan' });
    }

    const filePath = req.file.path;
    const fileType = FileParserService.getFileType(filePath);

    // Validate file
    const validation = FileParserService.validateFile(filePath);
    if (!validation.valid) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: validation.error });
    }

    // Only support Excel files for fixed format
    if (fileType !== 'xlsx' && fileType !== 'xls') {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Format tetap hanya mendukung file Excel (.xlsx, .xls)' });
    }

    try {
      // Parse dengan fixed format
      const { data, mapping } = FixedFormatParserService.parseFixedFormatExcel(filePath);
      
      // Validate apakah ini format tetap yang dikenal
      const formatValidation = FixedFormatParserService.validateFixedFormat(data.headers);
      
      if (!formatValidation.isFixedFormat) {
        // Fallback ke parsing biasa jika bukan format tetap
        const preview = await FileParserService.getPreview(filePath, fileType, 10);
        const autoMapping = ColumnMappingService.createAutoMapping(preview.headers);
        
        const uploadId = uuidv4();
        tempUploads.set(uploadId, {
          filePath,
          fileType,
          fileName: req.file.originalname
        });

        return res.json({
          uploadId,
          fileName: req.file.originalname,
          fileType,
          preview,
          totalRows: preview.totalRows,
          autoMapping,
          availableFields: ColumnMappingService.getAvailableFields(),
          requiredFields: ColumnMappingService.getRequiredFields(),
          isFixedFormat: false,
          message: 'File tidak menggunakan format tetap. Menggunakan auto-mapping biasa.'
        });
      }

      // Validate mapping untuk format tetap
      const mappingValidation = ColumnMappingService.validateMapping(mapping);
      
      // Create preview dari data yang sudah di-parse
      const preview: PreviewData = {
        headers: data.headers,
        rows: data.rows.slice(0, 10), // First 10 rows for preview
        totalRows: data.totalRows
      };

      // Create temporary upload record
      const uploadId = uuidv4();
      tempUploads.set(uploadId, {
        filePath,
        fileType,
        fileName: req.file.originalname
      });

      res.json({
        uploadId,
        fileName: req.file.originalname,
        fileType,
        preview,
        totalRows: data.totalRows,
        autoMapping: mapping,
        availableFields: ColumnMappingService.getAvailableFields(),
        requiredFields: ColumnMappingService.getRequiredFields(),
        isFixedFormat: true,
        formatValidation,
        mappingValid: mappingValidation.valid,
        mappingErrors: mappingValidation.errors,
        message: `Format tetap terdeteksi dengan confidence ${formatValidation.confidence}%. Kolom otomatis ter-mapping: ${formatValidation.detectedFields.join(', ')}`
      });

    } catch (parseError) {
      // Jika parsing fixed format gagal, fallback ke parsing biasa
      console.warn('Fixed format parsing failed, falling back to regular parsing:', parseError);
      
      const preview = await FileParserService.getPreview(filePath, fileType, 10);
      const autoMapping = ColumnMappingService.createAutoMapping(preview.headers);
      
      const uploadId = uuidv4();
      tempUploads.set(uploadId, {
        filePath,
        fileType,
        fileName: req.file.originalname
      });

      res.json({
        uploadId,
        fileName: req.file.originalname,
        fileType,
        preview,
        totalRows: preview.totalRows,
        autoMapping,
        availableFields: ColumnMappingService.getAvailableFields(),
        requiredFields: ColumnMappingService.getRequiredFields(),
        isFixedFormat: false,
        message: 'Gagal parsing format tetap. Menggunakan auto-mapping biasa.'
      });
    }

  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal mengupload file' });
  }
});

/**
 * POST /api/imports/upload
 * Upload file untuk import (original endpoint)
 * Feature: file-import, Property 1: File format validation
 * Feature: file-import, Property 2: File size limit enforcement
 */
router.post('/upload', authMiddleware, requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan' });
    }

    const filePath = req.file.path;
    const fileType = FileParserService.getFileType(filePath);

    // Validate file
    const validation = FileParserService.validateFile(filePath);
    if (!validation.valid) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: validation.error });
    }

    // Get preview
    const preview = await FileParserService.getPreview(filePath, fileType, 10);

    // Create auto-mapping berdasarkan headers dari row 5
    const autoMapping = ColumnMappingService.createAutoMapping(preview.headers);
    console.log('Auto-mapping created:', autoMapping);

    // Create temporary upload record
    const uploadId = uuidv4();
    tempUploads.set(uploadId, {
      filePath,
      fileType,
      fileName: req.file.originalname
    });

    res.json({
      uploadId,
      fileName: req.file.originalname,
      fileType,
      preview,
      totalRows: preview.totalRows,
      autoMapping, // Include auto-mapping in response
      availableFields: ColumnMappingService.getAvailableFields(),
      requiredFields: ColumnMappingService.getRequiredFields()
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal mengupload file' });
  }
});

/**
 * GET /api/imports/preview/:uploadId
 * Get preview data dari uploaded file
 * Feature: file-import, Property 3: Preview data accuracy
 */
router.get('/preview/:uploadId', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;

    // Find file by uploadId (stored in session or temp storage)
    // For now, we'll return error as this is handled in upload endpoint
    res.status(400).json({ error: 'Preview sudah diberikan saat upload' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal membaca preview' });
  }
});

/**
 * POST /api/imports/validate-mapping
 * Validate column mapping
 * Feature: file-import, Property 4: Required fields mapping validation
 */
router.post('/validate-mapping', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { mapping } = req.body;

    if (!mapping || typeof mapping !== 'object') {
      return res.status(400).json({ error: 'Mapping tidak valid' });
    }

    // Validate mapping
    const validation = ColumnMappingService.validateMapping(mapping);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Mapping tidak valid',
        errors: validation.errors
      });
    }

    res.json({
      valid: true,
      message: 'Mapping valid'
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal validasi mapping' });
  }
});

/**
 * POST /api/imports/suggest-mapping
 * Suggest mapping berdasarkan file headers (updated to use auto-mapping)
 */
router.post('/suggest-mapping', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { headers } = req.body;

    if (!Array.isArray(headers) || headers.length === 0) {
      return res.status(400).json({ error: 'Headers tidak valid' });
    }

    const suggestedMapping = ColumnMappingService.createAutoMapping(headers);
    const availableFields = ColumnMappingService.getAvailableFields();
    const requiredFields = ColumnMappingService.getRequiredFields();

    res.json({
      suggestedMapping,
      availableFields,
      requiredFields,
      headers
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal suggest mapping' });
  }
});

/**
 * POST /api/imports/validate-data
 * Validate mapped data sebelum import
 * Feature: file-import, Property 5: Empty field detection
 * Feature: file-import, Property 6: OPD user validation
 * Feature: file-import, Property 7: Duplicate detection by Nomor LHP
 */
router.post('/validate-data', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Data tidak valid' });
    }

    // Validate all rows
    const validationReport = await DataValidationService.validateRows(rows);

    res.json({
      validationReport,
      canProceed: validationReport.invalidRows.length === 0
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal validasi data' });
  }
});

/**
 * POST /api/imports/validate-data-with-mapping
 * Validate data dengan mapping (includes empty row filtering)
 * Feature: file-import, Property 5: Empty field detection
 * Feature: file-import, Property 6: OPD user validation
 * Feature: file-import, Property 7: Duplicate detection by Nomor LHP
 */
router.post('/validate-data-with-mapping', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, mapping } = req.body;

    if (!data || !mapping) {
      return res.status(400).json({ error: 'Data atau mapping tidak valid' });
    }

    // Apply mapping (this will filter out empty rows)
    const mappedData = ColumnMappingService.applyMapping(data, mapping);

    // Validate mapped rows
    const validationReport = await DataValidationService.validateRows(mappedData.rows);

    // Add mapping errors to validation report if any
    if (mappedData.errors.length > 0) {
      for (const mappingError of mappedData.errors) {
        validationReport.invalidRows.push({
          rowNumber: mappingError.rowNumber,
          errors: mappingError.errors
        });
      }
      validationReport.totalRows = data.totalRows;
      validationReport.validRows = validationReport.totalRows - validationReport.invalidRows.length - validationReport.duplicateRows.length;
    }

    res.json({
      validationReport,
      canProceed: validationReport.invalidRows.length === 0
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal validasi data' });
  }
});

/**
 * GET /api/imports/history
 * Get import history list
 * Feature: file-import, Property 13: Import history retrieval
 */
router.get('/history', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await ImportHistoryService.getImportHistory(limit, offset);

    res.json({
      history,
      limit,
      offset
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal ambil history' });
  }
});

/**
 * GET /api/imports/:importId/details
 * Get import details
 * Feature: file-import, Property 13: Import history retrieval
 */
router.get('/:importId/details', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { importId } = req.params;

    const details = await ImportHistoryService.getImportDetails(importId);

    if (!details) {
      return res.status(404).json({ error: 'Import tidak ditemukan' });
    }

    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal ambil detail import' });
  }
});

/**
 * GET /api/imports/:importId/download-report
 * Download import report
 */
router.get('/:importId/download-report', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { importId } = req.params;
    const format = req.query.format as string || 'json';

    let buffer: Buffer;
    let filename: string;

    if (format === 'csv') {
      buffer = await ImportHistoryService.downloadImportReportCSV(importId);
      filename = `import-report-${importId}.csv`;
      res.setHeader('Content-Type', 'text/csv');
    } else {
      buffer = await ImportHistoryService.downloadImportReport(importId);
      filename = `import-report-${importId}.json`;
      res.setHeader('Content-Type', 'application/json');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal download report' });
  }
});

/**
 * POST /api/imports/execute
 * Execute import dengan mapping
 * Feature: file-import, Property 11: Import summary accuracy
 */
router.post('/execute', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { uploadId, mapping, fileName, targetOPD } = req.body;
    const adminId = (req as any).user.id;

    if (!uploadId || !mapping || !fileName) {
      return res.status(400).json({ error: 'Parameter tidak lengkap' });
    }

    // Get stored file info
    const uploadInfo = tempUploads.get(uploadId);
    if (!uploadInfo) {
      return res.status(400).json({ error: 'File upload tidak ditemukan. Silakan upload ulang.' });
    }

    const { filePath, fileType } = uploadInfo;

    // Validate mapping
    const mappingValidation = ColumnMappingService.validateMapping(mapping);
    if (!mappingValidation.valid) {
      return res.status(400).json({
        error: 'Mapping tidak valid',
        errors: mappingValidation.errors
      });
    }

    // Execute import with target OPD
    const result = await ImportExecutionService.executeImport(
      filePath,
      fileType as FileType,
      mapping,
      adminId,
      fileName,
      targetOPD
    );

    // Clean up temp upload record
    tempUploads.delete(uploadId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal execute import' });
  }
});

/**
 * GET /api/imports/:importId/status
 * Get import status
 */
router.get('/:importId/status', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { importId } = req.params;

    const fileImport = await FileImportModel.getById(importId);

    if (!fileImport) {
      return res.status(404).json({ error: 'Import tidak ditemukan' });
    }

    res.json({
      id: fileImport.id,
      status: fileImport.status,
      totalRows: fileImport.total_rows,
      successCount: fileImport.success_count,
      failureCount: fileImport.failure_count,
      duplicateCount: fileImport.duplicate_count,
      errorMessage: fileImport.error_message,
      createdAt: fileImport.created_at,
      completedAt: fileImport.completed_at
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal ambil status' });
  }
});

/**
 * GET /api/imports/:importId/results
 * Get import results
 */
router.get('/:importId/results', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { importId } = req.params;

    const details = await ImportHistoryService.getImportDetails(importId);

    if (!details) {
      return res.status(404).json({ error: 'Import tidak ditemukan' });
    }

    res.json({
      summary: details.record,
      createdReports: details.createdReports,
      failedRows: details.failedRows
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal ambil results' });
  }
});

/**
 * POST /api/imports/:importId/retry-failed
 * Retry failed rows
 * Feature: file-import, Property 14: Partial import recovery
 */
router.post('/:importId/retry-failed', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { importId } = req.params;
    const adminId = (req as any).user.id;

    const result = await ImportExecutionService.retryFailedRows(importId, adminId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal retry failed rows' });
  }
});

/**
 * GET /api/imports/:importId/download-errors
 * Download error log
 * Feature: file-import, Property 7: Error handling
 */
router.get('/:importId/download-errors', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { importId } = req.params;

    const details = await ImportHistoryService.getImportDetails(importId);

    if (!details) {
      return res.status(404).json({ error: 'Import tidak ditemukan' });
    }

    if (details.failedRows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada error untuk di-download' });
    }

    // Create error report
    let csv = 'Error Report\n';
    csv += `Import ID,${importId}\n`;
    csv += `Timestamp,${details.record.timestamp}\n`;
    csv += `Total Errors,${details.failedRows.length}\n\n`;

    csv += 'Failed Rows\n';
    csv += 'Row Number,Reason\n';
    for (const failed of details.failedRows) {
      csv += `${failed.rowNumber},"${failed.reason}"\n`;
    }

    const buffer = Buffer.from(csv, 'utf-8');
    const filename = `error-report-${importId}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal download error log' });
  }
});

export default router;

