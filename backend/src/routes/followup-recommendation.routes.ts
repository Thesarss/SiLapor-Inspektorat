import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { canManageUsers } from '../utils/role-helpers';
import { FollowupRecommendationModel, FollowupRecommendationFileModel } from '../models/followup-recommendation.model';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/followup-recommendations';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}-${originalName}`);
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

/**
 * Get recommendations for a followup item
 */
router.get('/followup-items/:followupItemId/recommendations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { followupItemId } = req.params;
    const recommendations = await FollowupRecommendationModel.getByFollowupItemId(followupItemId);

    // Get files for each recommendation
    const recommendationsWithFiles = await Promise.all(
      recommendations.map(async (rec) => {
        const files = await FollowupRecommendationFileModel.getByRecommendationId(rec.id);
        return { ...rec, files };
      })
    );

    res.json({
      success: true,
      data: recommendationsWithFiles
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil data rekomendasi'
    });
  }
});

/**
 * Get all recommendations for inspektorat review
 */
router.get('/recommendations/for-review', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    
    if (!user || (user.role !== 'inspektorat' && user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat mengakses data review'
      });
    }

    const { 
      status = 'submitted',
      institution = '',
      limit = '50',
      offset = '0'
    } = req.query;

    // Build query conditions
    const conditions = ['fir.status = ?'];
    const params = [status];

    if (institution) {
      conditions.push('u.institution = ?');
      params.push(institution);
    }

    const whereClause = conditions.join(' AND ');
    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;

    // Get recommendations with related data
    const { query } = await import('../config/database');
    const result = await query(`
      SELECT 
        fir.id,
        fir.followup_item_id,
        fir.response,
        fir.status,
        fir.created_at,
        fir.updated_at,
        fir.review_notes,
        fi.temuan,
        fi.penyebab,
        fi.rekomendasi,
        r.id as report_id,
        r.title as report_title,
        u.name as submitted_by_name,
        u.institution,
        (SELECT COUNT(*) FROM followup_item_recommendation_files firf WHERE firf.followup_item_recommendation_id = fir.id) as file_count
      FROM followup_item_recommendations fir
      JOIN followup_items fi ON fir.followup_item_id = fi.id
      JOIN reports r ON fi.report_id = r.id
      JOIN users u ON r.assigned_to = u.id
      WHERE ${whereClause}
      ORDER BY fir.updated_at ASC
      LIMIT ? OFFSET ?
    `, [...params, limitNum, offsetNum]);

    // Get files for each recommendation
    const recommendationsWithFiles = await Promise.all(
      result.rows.map(async (rec: any) => {
        const files = await FollowupRecommendationFileModel.getByRecommendationId(rec.id);
        return { ...rec, files };
      })
    );

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM followup_item_recommendations fir
      JOIN followup_items fi ON fir.followup_item_id = fi.id
      JOIN reports r ON fi.report_id = r.id
      JOIN users u ON r.assigned_to = u.id
      WHERE ${whereClause}
    `, params);

    const total = countResult.rows[0]?.total || 0;

    res.json({
      success: true,
      data: {
        recommendations: recommendationsWithFiles,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error getting recommendations for review:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil data rekomendasi untuk review'
    });
  }
});

/**
 * Update recommendation response
 */
router.put('/recommendations/:id/response', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Response tidak boleh kosong'
      });
    }

    // Check if recommendation exists
    const recommendation = await FollowupRecommendationModel.getById(id);
    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Rekomendasi tidak ditemukan'
      });
    }

    // Check if user has files uploaded for this recommendation
    const files = await FollowupRecommendationFileModel.getByRecommendationId(id);
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Harap upload minimal 1 file bukti sebelum mengirim response'
      });
    }

    await FollowupRecommendationModel.updateResponse(id, response, 'submitted');

    res.json({
      success: true,
      message: 'Response berhasil dikirim'
    });
  } catch (error) {
    console.error('Error updating recommendation response:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengirim response'
    });
  }
});

/**
 * Upload file for recommendation (supports multiple files)
 */
router.post('/recommendations/:id/files', authMiddleware, upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    const userId = req.user?.id;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tidak ada file yang diupload'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
    }

    // Check if recommendation exists
    const recommendation = await FollowupRecommendationModel.getById(id);
    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Rekomendasi tidak ditemukan'
      });
    }

    // Create file records for all uploaded files
    const fileRecords = [];
    for (const file of files) {
      try {
        const fileRecord = await FollowupRecommendationFileModel.create({
          recommendation_id: id,
          original_name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
          stored_name: file.filename,
          file_path: file.path,
          file_size: file.size,
          uploaded_by: userId
        });
        fileRecords.push(fileRecord);
      } catch (error) {
        console.error(`Error creating file record for ${file.originalname}:`, error);
      }
    }

    res.json({
      success: true,
      data: fileRecords,
      message: `${fileRecords.length} file berhasil diupload`
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal upload file'
    });
  }
});

/**
 * Download recommendation file
 */
router.get('/recommendations/files/download/:fileId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;

    const file = await FollowupRecommendationFileModel.getById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File tidak ditemukan'
      });
    }

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File tidak ditemukan di server'
      });
    }

    res.download(file.file_path, file.original_name);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal download file'
    });
  }
});

/**
 * Delete recommendation file
 */
router.delete('/recommendations/files/:fileId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;

    const file = await FollowupRecommendationFileModel.getById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File tidak ditemukan'
      });
    }

    // Delete physical file
    if (fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }

    // Delete database record
    await FollowupRecommendationFileModel.delete(fileId);

    res.json({
      success: true,
      message: 'File berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal menghapus file'
    });
  }
});

/**
 * Admin: Approve recommendation
 */
router.post('/recommendations/:id/approve', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;

    if (userRole !== 'inspektorat' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat menyetujui rekomendasi'
      });
    }

    const recommendation = await FollowupRecommendationModel.getById(id);
    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Rekomendasi tidak ditemukan'
      });
    }

    await FollowupRecommendationModel.updateStatus(id, 'approved');

    // Check if all recommendations in the report are approved
    await checkAndCompleteReport(recommendation.followup_item_id);

    res.json({
      success: true,
      message: 'Rekomendasi berhasil disetujui'
    });
  } catch (error) {
    console.error('Error approving recommendation:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal menyetujui rekomendasi'
    });
  }
});

/**
 * Check if all recommendations are approved and auto-complete report
 */
async function checkAndCompleteReport(followupItemId: string) {
  try {
    // Get all recommendations for this followup item
    const recommendations = await FollowupRecommendationModel.getByFollowupItemId(followupItemId);
    
    // Check if all recommendations are approved
    const allRecommendationsApproved = recommendations.every(rec => rec.status === 'approved');
    
    if (allRecommendationsApproved && recommendations.length > 0) {
      // Get the followup item to find the report
      const { FollowupItemModel } = await import('../models/followup-item.model');
      const followupItem = await FollowupItemModel.getById(followupItemId);
      
      if (followupItem) {
        // Update followup item status to approved
        await FollowupItemModel.updateStatus(followupItemId, 'approved');
        
        // Get all followup items for this report
        const allFollowupItems = await FollowupItemModel.getByReportId(followupItem.report_id);
        
        // Check if all followup items in the report are approved
        const allFollowupItemsApproved = allFollowupItems.every(item => item.status === 'approved');
        
        if (allFollowupItemsApproved && allFollowupItems.length > 0) {
          // Auto-complete the report
          const { ReportModel } = await import('../models/report.model');
          await ReportModel.updateStatus(followupItem.report_id, 'approved');
          
          console.log(`✅ Report ${followupItem.report_id} auto-completed - all recommendations approved`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking report completion:', error);
  }
}

/**
 * Admin: Reject recommendation
 */
router.post('/recommendations/:id/reject', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userRole = req.user?.role;

    if (userRole !== 'inspektorat' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Hanya Inspektorat yang dapat menolak rekomendasi'
      });
    }

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Catatan penolakan wajib diisi'
      });
    }

    const recommendation = await FollowupRecommendationModel.getById(id);
    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Rekomendasi tidak ditemukan'
      });
    }

    // Update recommendation status to rejected with notes
    await FollowupRecommendationModel.updateStatus(id, 'rejected', notes);

    // Update report status to needs_revision if it has rejected recommendations
    await updateReportStatusForRejection(recommendation.followup_item_id);

    res.json({
      success: true,
      message: 'Rekomendasi berhasil ditolak. User perlu memperbaiki rekomendasi ini saja.'
    });
  } catch (error) {
    console.error('Error rejecting recommendation:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal menolak rekomendasi'
    });
  }
});

/**
 * Update report status when a recommendation is rejected
 */
async function updateReportStatusForRejection(followupItemId: string) {
  try {
    // Get the followup item to find the report
    const { FollowupItemModel } = await import('../models/followup-item.model');
    const followupItem = await FollowupItemModel.getById(followupItemId);
    
    if (followupItem) {
      // Update followup item status to needs_revision (not the whole report)
      await FollowupItemModel.updateStatus(followupItemId, 'needs_revision');
      
      // Update report status to needs_revision to indicate there are items needing attention
      const { ReportModel } = await import('../models/report.model');
      await ReportModel.updateStatus(followupItem.report_id, 'needs_revision');
      
      console.log(`📝 Report ${followupItem.report_id} marked as needs_revision - individual recommendation rejected`);
    }
  } catch (error) {
    console.error('Error updating report status for rejection:', error);
  }
}

export default router;