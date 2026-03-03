import { FollowUpModel } from '../models/followup.model';
import { ReportModel } from '../models/report.model';
import { UserModel } from '../models/user.model';
import { EmailService } from './email.service';
import { FollowUp } from '../types';
import { createError } from '../middleware/error.middleware';

export const ApprovalService = {
  async approveFollowUp(id: string, adminId: string, notes?: string): Promise<FollowUp> {
    const followUp = await FollowUpModel.findById(id);

    if (!followUp) {
      throw createError('Follow-up not found', 404);
    }

    if (followUp.status !== 'pending_approval') {
      throw createError('Follow-up is not pending approval', 400);
    }

    // Update follow-up status to approved
    const updated = await FollowUpModel.updateStatus(id, 'approved', adminId, notes);

    if (!updated) {
      throw createError('Failed to approve follow-up', 500);
    }

    // Update report status to approved
    await ReportModel.updateStatus(updated.report_id, 'approved');

    // Send email notification to user
    try {
      const user = await UserModel.findById(updated.user_id);
      if (user) {
        await EmailService.sendApprovalNotification(user, updated);
      }
    } catch (error) {
      console.error('Failed to send approval email:', error);
    }

    return updated;
  },

  async rejectFollowUp(id: string, adminId: string, notes: string): Promise<FollowUp> {
    // Validate rejection note is provided
    if (!notes || notes.trim().length === 0) {
      throw createError('Catatan penolakan wajib diisi', 400);
    }

    const followUp = await FollowUpModel.findById(id);

    if (!followUp) {
      throw createError('Follow-up not found', 404);
    }

    if (followUp.status !== 'pending_approval') {
      throw createError('Follow-up is not pending approval', 400);
    }

    // Update follow-up status to rejected
    const updated = await FollowUpModel.updateStatus(id, 'rejected', adminId, notes);

    if (!updated) {
      throw createError('Failed to reject follow-up', 500);
    }

    // Update report status to rejected
    await ReportModel.updateStatus(updated.report_id, 'rejected');

    // Send email notification to user with rejection reason
    try {
      const user = await UserModel.findById(updated.user_id);
      if (user) {
        await EmailService.sendRejectionNotification(user, updated, notes);
      }
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }

    return updated;
  },

  async getAllPendingReviews(): Promise<any[]> {
    const { query } = await import('../config/database');
    
    const allReviews: any[] = [];
    
    console.log('🔍 [getAllPendingReviews] Starting to fetch all pending reviews...');
    
    // Get pending follow-ups
    const followUpsResult = await query(`
      SELECT 
        f.*,
        r.title as report_title,
        r.description as report_description,
        r.created_at as report_created_at,
        u.name as user_name,
        u.email as user_email,
        u.institution as user_institution,
        reviewer.name as reviewer_name,
        'follow_up' as review_type
      FROM follow_ups f
      JOIN reports r ON f.report_id = r.id
      JOIN users u ON f.user_id = u.id
      LEFT JOIN users reviewer ON f.reviewed_by = reviewer.id
      WHERE f.status = 'pending_approval'
      ORDER BY f.created_at ASC
    `);
    
    console.log('📝 Follow-ups found:', followUpsResult.rows.length);
    allReviews.push(...followUpsResult.rows);

    // Get pending recommendations
    const recommendationsResult = await query(`
      SELECT 
        fir.*,
        fi.temuan as item_description,
        r.title as report_title,
        r.description as report_description,
        r.created_at as report_created_at,
        u.name as user_name,
        u.email as user_email,
        u.institution as user_institution,
        'recommendation' as review_type
      FROM followup_item_recommendations fir
      JOIN followup_items fi ON fir.followup_item_id = fi.id
      JOIN reports r ON fi.report_id = r.id
      JOIN users u ON r.created_by = u.id
      WHERE fir.status = 'submitted'
      ORDER BY fir.created_at ASC
    `);
    
    console.log('💡 Recommendations found:', recommendationsResult.rows.length);
    allReviews.push(...recommendationsResult.rows);

    // Get submitted matrix items
    try {
      const matrixItemsResult = await query(`
        SELECT DISTINCT
          mi.*,
          mr.title as matrix_title,
          mr.description as matrix_description,
          mr.created_at as matrix_created_at,
          mr.target_opd as user_institution,
          reviewer.name as reviewer_name,
          'matrix_item' as review_type
        FROM matrix_items mi
        JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
        LEFT JOIN users reviewer ON mi.reviewed_by = reviewer.id
        WHERE mi.status = 'submitted'
        ORDER BY mi.created_at ASC
      `);
      
      console.log('📊 Matrix items found:', matrixItemsResult.rows.length);
      console.log('📊 Matrix items data:', JSON.stringify(matrixItemsResult.rows, null, 2));
      allReviews.push(...matrixItemsResult.rows);
    } catch (error) {
      console.log('⚠️  Matrix items table not available:', error);
    }

    // Get pending evidence files
    try {
      const evidenceResult = await query(`
        SELECT 
          ef.*,
          u.name as user_name,
          u.email as user_email,
          u.institution as user_institution,
          reviewer.name as reviewer_name,
          'evidence' as review_type
        FROM evidence_files ef
        JOIN users u ON ef.uploaded_by = u.id
        LEFT JOIN users reviewer ON ef.reviewed_by = reviewer.id
        WHERE ef.status = 'pending'
        ORDER BY ef.uploaded_at ASC
      `);
      
      console.log('📎 Evidence files found:', evidenceResult.rows.length);
      allReviews.push(...evidenceResult.rows);
    } catch (error) {
      console.log('⚠️  Evidence files table not available:', error);
    }
    
    console.log('✅ [getAllPendingReviews] Total reviews found:', allReviews.length);
    console.log('✅ [getAllPendingReviews] Returning data...');
    
    return allReviews;
  },

  async getAllReviewedItems(): Promise<any[]> {
    const { query } = await import('../config/database');
    
    const allReviewed: any[] = [];
    
    // Get reviewed follow-ups
    const followUpsResult = await query(`
      SELECT 
        f.*,
        r.title as report_title,
        r.description as report_description,
        r.created_at as report_created_at,
        u.name as user_name,
        u.email as user_email,
        u.institution as user_institution,
        reviewer.name as reviewer_name,
        'follow_up' as review_type
      FROM follow_ups f
      JOIN reports r ON f.report_id = r.id
      JOIN users u ON f.user_id = u.id
      LEFT JOIN users reviewer ON f.reviewed_by = reviewer.id
      WHERE f.status IN ('approved', 'rejected')
      ORDER BY f.reviewed_at DESC
    `);
    
    allReviewed.push(...followUpsResult.rows);

    // Get reviewed recommendations
    const recommendationsResult = await query(`
      SELECT 
        fir.*,
        fi.temuan as item_description,
        r.title as report_title,
        r.description as report_description,
        r.created_at as report_created_at,
        u.name as user_name,
        u.email as user_email,
        u.institution as user_institution,
        reviewer.name as reviewer_name,
        'recommendation' as review_type
      FROM followup_item_recommendations fir
      JOIN followup_items fi ON fir.followup_item_id = fi.id
      JOIN reports r ON fi.report_id = r.id
      JOIN users u ON r.created_by = u.id
      LEFT JOIN users reviewer ON fir.reviewed_by = reviewer.id
      WHERE fir.status IN ('approved', 'rejected')
      ORDER BY fir.reviewed_at DESC
    `);
    
    allReviewed.push(...recommendationsResult.rows);

    // Get reviewed matrix items
    try {
      const matrixItemsResult = await query(`
        SELECT DISTINCT
          mi.*,
          mr.title as matrix_title,
          mr.description as matrix_description,
          mr.created_at as matrix_created_at,
          mr.target_opd as user_institution,
          reviewer.name as reviewer_name,
          'matrix_item' as review_type
        FROM matrix_items mi
        JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
        LEFT JOIN users reviewer ON mi.reviewed_by = reviewer.id
        WHERE mi.status IN ('approved', 'rejected')
        ORDER BY mi.reviewed_at DESC
      `);
      
      allReviewed.push(...matrixItemsResult.rows);
    } catch (error) {
      console.log('Matrix items table not available');
    }

    // Get reviewed evidence files
    try {
      const evidenceResult = await query(`
        SELECT 
          ef.*,
          u.name as user_name,
          u.email as user_email,
          u.institution as user_institution,
          reviewer.name as reviewer_name,
          'evidence' as review_type
        FROM evidence_files ef
        JOIN users u ON ef.uploaded_by = u.id
        LEFT JOIN users reviewer ON ef.reviewed_by = reviewer.id
        WHERE ef.status IN ('approved', 'rejected')
        ORDER BY ef.reviewed_at DESC
      `);
      
      allReviewed.push(...evidenceResult.rows);
    } catch (error) {
      console.log('Evidence files table not available');
    }
    
    return allReviewed;
  },

  async getPendingFollowUps(): Promise<any[]> {
    // Get follow-ups with report details
    const { query } = await import('../config/database');
    const result = await query(`
      SELECT 
        f.*,
        r.title as report_title,
        r.description as report_description,
        r.created_at as report_created_at,
        u.name as user_name,
        u.email as user_email,
        u.institution as user_institution
      FROM follow_ups f
      JOIN reports r ON f.report_id = r.id
      JOIN users u ON f.user_id = u.id
      WHERE f.status = 'pending_approval'
      ORDER BY f.created_at ASC
    `);
    
    return result.rows;
  },

  async getAdminPendingCount(): Promise<number> {
    const { query } = await import('../config/database');
    
    // Count pending follow-ups
    const followUpsResult = await query(`
      SELECT COUNT(*) as count 
      FROM follow_ups 
      WHERE status = 'pending_approval'
    `);
    
    // Count pending recommendations (submitted status means waiting for admin review)
    const recommendationsResult = await query(`
      SELECT COUNT(*) as count 
      FROM followup_item_recommendations 
      WHERE status = 'submitted'
    `);
    
    // Count reports that need revision items to be created
    const reportsNeedingRevisionResult = await query(`
      SELECT COUNT(*) as count 
      FROM reports r
      WHERE r.status = 'needs_revision' 
        AND NOT EXISTS (
          SELECT 1 FROM revision_items ri 
          WHERE ri.report_id = r.id
        )
    `);
    
    // Count completed revision items that need admin review
    const completedRevisionsResult = await query(`
      SELECT COUNT(*) as count 
      FROM revision_items 
      WHERE status = 'completed'
    `);

    // Count matrix items that need review
    const matrixItemsResult = await query(`
      SELECT COUNT(*) as count 
      FROM matrix_items 
      WHERE status = 'submitted'
    `);

    // Count evidence files that need review
    const evidenceResult = await query(`
      SELECT COUNT(*) as count 
      FROM evidence_files 
      WHERE status = 'pending'
    `);
    
    const followUpsCount = followUpsResult.rows[0]?.count || 0;
    const recommendationsCount = recommendationsResult.rows[0]?.count || 0;
    const reportsNeedingRevision = reportsNeedingRevisionResult.rows[0]?.count || 0;
    const completedRevisions = completedRevisionsResult.rows[0]?.count || 0;
    const matrixItemsCount = matrixItemsResult.rows[0]?.count || 0;
    const evidenceCount = evidenceResult.rows[0]?.count || 0;
    
    return parseInt(followUpsCount) + parseInt(recommendationsCount) + parseInt(reportsNeedingRevision) + parseInt(completedRevisions) + parseInt(matrixItemsCount) + parseInt(evidenceCount);
  },

  async getAdminPendingDetails(): Promise<{
    followUps: number;
    recommendations: number;
    reportsNeedingRevision: number;
    completedRevisions: number;
    matrixItems: number;
    evidence: number;
    total: number;
  }> {
    const { query } = await import('../config/database');
    
    // Count pending follow-ups
    const followUpsResult = await query(`
      SELECT COUNT(*) as count 
      FROM follow_ups 
      WHERE status = 'pending_approval'
    `);
    
    // Count pending recommendations
    const recommendationsResult = await query(`
      SELECT COUNT(*) as count 
      FROM followup_item_recommendations 
      WHERE status = 'submitted'
    `);
    
    // Count reports that need revision items to be created
    const reportsNeedingRevisionResult = await query(`
      SELECT COUNT(*) as count 
      FROM reports r
      WHERE r.status = 'needs_revision' 
        AND NOT EXISTS (
          SELECT 1 FROM revision_items ri 
          WHERE ri.report_id = r.id
        )
    `);
    
    // Count completed revision items that need admin review
    const completedRevisionsResult = await query(`
      SELECT COUNT(*) as count 
      FROM revision_items 
      WHERE status = 'completed'
    `);

    // Count matrix items that need review
    const matrixItemsResult = await query(`
      SELECT COUNT(*) as count 
      FROM matrix_items 
      WHERE status = 'submitted'
    `);

    // Count evidence files that need review
    const evidenceResult = await query(`
      SELECT COUNT(*) as count 
      FROM evidence_files 
      WHERE status = 'pending'
    `);
    
    const followUps = parseInt(followUpsResult.rows[0]?.count || 0);
    const recommendations = parseInt(recommendationsResult.rows[0]?.count || 0);
    const reportsNeedingRevision = parseInt(reportsNeedingRevisionResult.rows[0]?.count || 0);
    const completedRevisions = parseInt(completedRevisionsResult.rows[0]?.count || 0);
    const matrixItems = parseInt(matrixItemsResult.rows[0]?.count || 0);
    const evidence = parseInt(evidenceResult.rows[0]?.count || 0);
    
    return {
      followUps,
      recommendations,
      reportsNeedingRevision,
      completedRevisions,
      matrixItems,
      evidence,
      total: followUps + recommendations + reportsNeedingRevision + completedRevisions + matrixItems + evidence
    };
  },
};
