import { query } from '../config/database';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface EvidenceFile {
  id: string;
  matrix_item_id: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  file_hash?: string;
  uploaded_by: string;
  uploaded_at: Date;
  description?: string;
  tags?: any;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  reviewed_by?: string;
  reviewed_at?: Date;
  review_notes?: string;
  searchable_content?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: Date;
  updated_at: Date;
}

export interface EvidenceSearchFilters {
  search?: string;
  category?: string;
  status?: string;
  priority?: string;
  file_type?: string;
  uploaded_by?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export class EvidenceService {
  
  /**
   * Upload evidence file
   */
  static async uploadEvidence(
    matrixItemId: string,
    file: Express.Multer.File,
    uploadedBy: string,
    metadata: {
      description?: string;
      category?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
    }
  ): Promise<{ success: boolean; data?: EvidenceFile; error?: string }> {
    try {
      // Generate file hash for duplicate detection
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Check for duplicates
      const duplicateCheck = await query<RowDataPacket[]>(
        'SELECT id FROM evidence_files WHERE file_hash = ?',
        [fileHash]
      );
      
      if (duplicateCheck.rows.length > 0) {
        return { success: false, error: 'File sudah pernah diupload sebelumnya' };
      }
      
      const evidenceId = uuidv4();
      const storedFilename = `${evidenceId}_${file.originalname}`;
      const finalPath = path.join(file.destination, storedFilename);
      
      // Rename file to include evidence ID
      fs.renameSync(file.path, finalPath);
      
      // Insert evidence record
      await query(
        `INSERT INTO evidence_files (
          id, matrix_item_id, original_filename, stored_filename, file_path,
          file_size, file_type, mime_type, file_hash, uploaded_by,
          description, category, priority, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          evidenceId,
          matrixItemId,
          file.originalname,
          storedFilename,
          finalPath,
          file.size,
          path.extname(file.originalname).toLowerCase().substring(1),
          file.mimetype,
          fileHash,
          uploadedBy,
          metadata.description || null,
          metadata.category || 'Lainnya',
          metadata.priority || 'medium',
          metadata.tags ? JSON.stringify(metadata.tags) : null
        ]
      );
      
      // Log activity
      await this.logActivity(uploadedBy, 'upload', 'evidence', evidenceId, {
        filename: file.originalname,
        size: file.size,
        category: metadata.category
      });
      
      // Get the created evidence
      const result = await query<RowDataPacket[]>(
        'SELECT * FROM evidence_files WHERE id = ?',
        [evidenceId]
      );
      
      return { success: true, data: result.rows[0] as EvidenceFile };
      
    } catch (error) {
      console.error('Evidence upload error:', error);
      return { success: false, error: 'Gagal mengupload evidence' };
    }
  }

  /**
   * Upload evidence for a matrix item (OPD workflow)
   */
  static async uploadMatrixEvidence(
    matrixItemId: string,
    assignmentId: string,
    file: Express.Multer.File,
    uploadedBy: string,
    metadata?: {
      description?: string;
      category?: string;
      priority?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Verify matrix item exists and user has access
      const matrixItemResult = await query(`
        SELECT mi.*, ma.assigned_to, mr.title as matrix_title
        FROM matrix_items mi
        JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
        JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
        WHERE mi.id = ? AND ma.id = ? AND ma.assigned_to = ?
      `, [matrixItemId, assignmentId, uploadedBy]);
      
      if (matrixItemResult.rows.length === 0) {
        return { success: false, error: 'Matrix item tidak ditemukan atau Anda tidak memiliki akses' };
      }
      
      const matrixItem = matrixItemResult.rows[0];
      
      // Create evidence record
      const evidenceId = uuidv4();
      const category = metadata?.category || 'Tindak Lanjut';
      const priority = metadata?.priority || 'medium';
      const description = metadata?.description || `Evidence untuk: ${matrixItem.temuan}`;
      
      await query(`
        INSERT INTO evidence_files (
          id, matrix_item_id, assignment_id, original_filename, stored_filename, 
          file_path, file_size, file_type, mime_type, description, category, 
          priority, status, uploaded_by, searchable_content
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        evidenceId,
        matrixItemId,
        assignmentId,
        file.originalname,
        file.filename,
        file.path,
        file.size,
        path.extname(file.originalname).substring(1).toLowerCase(),
        file.mimetype,
        description,
        category,
        priority,
        'submitted', // Auto-submit for matrix evidence
        uploadedBy,
        `${file.originalname} ${description} ${matrixItem.temuan} ${matrixItem.rekomendasi}`
      ]);
      
      // Update matrix item evidence tracking
      await query(`
        UPDATE matrix_items 
        SET evidence_submitted = TRUE, 
            evidence_count = evidence_count + 1,
            last_evidence_at = NOW(),
            status = CASE WHEN status = 'pending' THEN 'submitted' ELSE status END
        WHERE id = ?
      `, [matrixItemId]);
      
      // Update assignment progress
      await this.updateAssignmentProgress(assignmentId);
      
      return {
        success: true,
        data: {
          id: evidenceId,
          matrix_item_id: matrixItemId,
          assignment_id: assignmentId,
          filename: file.originalname,
          status: 'submitted'
        }
      };
      
    } catch (error) {
      console.error('Upload matrix evidence error:', error);
      return { success: false, error: 'Gagal mengupload evidence' };
    }
  }

  /**
   * Update assignment progress based on submitted evidence
   */
  static async updateAssignmentProgress(assignmentId: string): Promise<void> {
    try {
      // Calculate progress
      const progressResult = await query(`
        SELECT 
          COUNT(mi.id) as total_items,
          COUNT(CASE WHEN mi.evidence_submitted = TRUE THEN 1 END) as items_with_evidence,
          ROUND((COUNT(CASE WHEN mi.evidence_submitted = TRUE THEN 1 END) / COUNT(mi.id)) * 100, 2) as progress_percentage
        FROM matrix_assignments ma
        JOIN matrix_items mi ON mi.matrix_report_id = ma.matrix_report_id
        WHERE ma.id = ?
      `, [assignmentId]);
      
      if (progressResult.rows.length > 0) {
        const progress = progressResult.rows[0];
        
        await query(`
          UPDATE matrix_assignments 
          SET 
            total_items = ?,
            items_with_evidence = ?,
            progress_percentage = ?,
            last_activity_at = NOW(),
            status = CASE 
              WHEN ? >= 100 THEN 'completed'
              WHEN ? > 0 THEN 'in_progress'
              ELSE status 
            END
          WHERE id = ?
        `, [
          progress.total_items,
          progress.items_with_evidence,
          progress.progress_percentage,
          progress.progress_percentage,
          progress.progress_percentage,
          assignmentId
        ]);
      }
      
    } catch (error) {
      console.error('Update assignment progress error:', error);
    }
  }

  /**
   * Get matrix progress for inspektorat monitoring
   */
  static async getMatrixProgress(inspektoratId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const progressResult = await query(`
        SELECT * FROM matrix_progress_view 
        WHERE assigned_by = ?
        ORDER BY last_activity_at DESC, assigned_at DESC
      `, [inspektoratId]);
      
      return {
        success: true,
        data: progressResult.rows
      };
      
    } catch (error) {
      console.error('Get matrix progress error:', error);
      return { success: false, error: 'Gagal mengambil data progress matrix' };
    }
  }

  /**
   * Get evidence tracking for matrix items
   */
  static async getMatrixEvidenceTracking(
    inspektoratId: string,
    filters?: {
      matrix_report_id?: string;
      target_opd?: string;
      status?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      
      // Don't filter by uploaded_by for inspektorat - they should see all
      // Only add filters if provided
      
      if (filters?.matrix_report_id) {
        whereConditions.push('matrix_report_id = ?');
        queryParams.push(filters.matrix_report_id);
      }
      
      if (filters?.target_opd) {
        whereConditions.push('target_opd = ?');
        queryParams.push(filters.target_opd);
      }
      
      if (filters?.status) {
        whereConditions.push('item_status = ?');
        queryParams.push(filters.status);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      console.log('🔍 Evidence tracking query:', { whereClause, queryParams });
      
      const trackingResult = await query(`
        SELECT * FROM matrix_evidence_tracking 
        ${whereClause}
        ORDER BY matrix_title, item_number
      `, queryParams);
      
      console.log('✅ Evidence tracking result:', trackingResult.rows.length, 'rows');
      
      return {
        success: true,
        data: trackingResult.rows
      };
      
    } catch (error: any) {
      console.error('❌ Get matrix evidence tracking error:', error.message);
      console.error('   SQL:', error.sql);
      return { success: false, error: 'Gagal mengambil data tracking evidence' };
    }
  }
  
  /**
   * Search evidence with filters
   */
  static async searchEvidence(
    filters: EvidenceSearchFilters,
    userId: string,
    userRole: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      
      // Base query with joins - Use DISTINCT to avoid duplicates
      let baseQuery = `
        FROM evidence_files ef
        LEFT JOIN users u1 ON ef.uploaded_by = u1.id
        LEFT JOIN users u2 ON ef.reviewed_by = u2.id
        LEFT JOIN matrix_items mi ON ef.matrix_item_id = mi.id
        LEFT JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      `;
      
      // Role-based access control
      if (userRole === 'opd') {
        whereConditions.push('ef.uploaded_by = ?');
        queryParams.push(userId);
      } else if (userRole === 'inspektorat') {
        // Inspektorat can see all evidence
      } else if (userRole === 'super_admin') {
        // Super admin can see all evidence
      }
      
      // Apply filters
      if (filters.search) {
        whereConditions.push(`(
          ef.original_filename LIKE ? OR 
          ef.description LIKE ? OR 
          ef.searchable_content LIKE ? OR
          mi.temuan LIKE ? OR
          mi.rekomendasi LIKE ?
        )`);
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (filters.category) {
        whereConditions.push('ef.category = ?');
        queryParams.push(filters.category);
      }
      
      if (filters.status) {
        whereConditions.push('ef.status = ?');
        queryParams.push(filters.status);
      }
      
      if (filters.priority) {
        whereConditions.push('ef.priority = ?');
        queryParams.push(filters.priority);
      }
      
      if (filters.file_type) {
        whereConditions.push('ef.file_type = ?');
        queryParams.push(filters.file_type);
      }
      
      if (filters.uploaded_by) {
        whereConditions.push('ef.uploaded_by = ?');
        queryParams.push(filters.uploaded_by);
      }
      
      if (filters.date_from) {
        whereConditions.push('ef.uploaded_at >= ?');
        queryParams.push(filters.date_from);
      }
      
      if (filters.date_to) {
        whereConditions.push('ef.uploaded_at <= ?');
        queryParams.push(filters.date_to + ' 23:59:59');
      }
      
      // Build WHERE clause
      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';
      
      // Count total records - Use DISTINCT to avoid counting duplicates
      const countQuery = `SELECT COUNT(DISTINCT ef.id) as total ${baseQuery} ${whereClause}`;
      const countResult = await query<RowDataPacket[]>(countQuery, queryParams);
      const total = countResult.rows[0].total;
      
      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      
      // Sorting
      const sortBy = filters.sort_by || 'uploaded_at';
      const sortOrder = filters.sort_order || 'DESC';
      
      // Main query - Use DISTINCT to avoid duplicate rows
      const mainQuery = `
        SELECT DISTINCT
          ef.id,
          ef.matrix_item_id,
          ef.original_filename as evidence_filename,
          ef.file_size as evidence_file_size,
          ef.file_path as evidence_file_path,
          ef.status,
          ef.uploaded_at,
          ef.reviewed_at,
          ef.review_notes,
          u1.name as uploaded_by_name,
          u1.institution as uploader_institution,
          u2.name as reviewed_by_name,
          mi.item_number,
          mi.temuan,
          mi.penyebab,
          mi.rekomendasi,
          mi.tindak_lanjut,
          mr.id as matrix_report_id,
          mr.title as matrix_title,
          mr.target_opd
        ${baseQuery}
        ${whereClause}
        ORDER BY ef.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      const result = await query<RowDataPacket[]>(mainQuery, [...queryParams, limit, offset]);
      
      // Log search activity
      await this.logActivity(userId, 'search', 'evidence', null, {
        filters,
        results_count: result.rows.length
      });
      
      return {
        success: true,
        data: {
          evidence: result.rows,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
      
    } catch (error) {
      console.error('Evidence search error:', error);
      return { success: false, error: 'Gagal mencari evidence' };
    }
  }
  
  /**
   * Get evidence by ID
   */
  static async getEvidenceById(
    evidenceId: string,
    userId: string,
    userRole: string
  ): Promise<{ success: boolean; data?: EvidenceFile; error?: string }> {
    try {
      let query_sql = `
        SELECT 
          ef.*,
          u1.name as uploaded_by_name,
          u1.institution as uploader_institution,
          u2.name as reviewed_by_name,
          mi.temuan,
          mi.rekomendasi,
          mr.title as matrix_title,
          mr.target_opd
        FROM evidence_files ef
        LEFT JOIN users u1 ON ef.uploaded_by = u1.id
        LEFT JOIN users u2 ON ef.reviewed_by = u2.id
        LEFT JOIN matrix_items mi ON ef.matrix_item_id = mi.id
        LEFT JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
        WHERE ef.id = ?
      `;
      
      const params = [evidenceId];
      
      // Role-based access control
      if (userRole === 'opd') {
        query_sql += ' AND ef.uploaded_by = ?';
        params.push(userId);
      }
      
      const result = await query<RowDataPacket[]>(query_sql, params);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Evidence tidak ditemukan atau tidak memiliki akses' };
      }
      
      return { success: true, data: result.rows[0] as EvidenceFile };
      
    } catch (error) {
      console.error('Get evidence error:', error);
      return { success: false, error: 'Gagal mengambil data evidence' };
    }
  }
  
  /**
   * Review evidence (Inspektorat only)
   */
  static async reviewEvidence(
    evidenceId: string,
    reviewedBy: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await query(
        `UPDATE evidence_files 
         SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_notes = ?
         WHERE id = ?`,
        [status, reviewedBy, reviewNotes, evidenceId]
      );
      
      // Log activity
      await this.logActivity(reviewedBy, 'review', 'evidence', evidenceId, {
        status,
        review_notes: reviewNotes
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Evidence review error:', error);
      return { success: false, error: 'Gagal mereview evidence' };
    }
  }
  
  /**
   * Get evidence categories
   */
  static async getCategories(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const result = await query<RowDataPacket[]>(
        'SELECT * FROM evidence_categories WHERE is_active = TRUE ORDER BY sort_order'
      );
      
      return { success: true, data: result.rows };
      
    } catch (error) {
      console.error('Get categories error:', error);
      return { success: false, error: 'Gagal mengambil kategori' };
    }
  }
  
  /**
   * Get evidence tags
   */
  static async getTags(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const result = await query<RowDataPacket[]>(
        'SELECT * FROM evidence_tags ORDER BY usage_count DESC, name ASC'
      );
      
      return { success: true, data: result.rows };
      
    } catch (error) {
      console.error('Get tags error:', error);
      return { success: false, error: 'Gagal mengambil tags' };
    }
  }
  
  /**
   * Log user activity
   */
  private static async logActivity(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO user_activity_logs (
          id, user_id, action, resource_type, resource_id, details, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          action,
          resourceType,
          resourceId,
          JSON.stringify(details),
          ipAddress || null,
          userAgent || null
        ]
      );
    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't throw error for logging failures
    }
  }
}