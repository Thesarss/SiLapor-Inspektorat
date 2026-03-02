import { query } from '../config/database';

export interface FollowupRecommendation {
  id: string;
  followup_item_id: string;
  recommendation_text: string;
  recommendation_index: number;
  opd_response?: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  admin_notes?: string;
  submitted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface FollowupRecommendationFile {
  id: string;
  recommendation_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: Date;
}

export class FollowupRecommendationModel {
  /**
   * Create individual recommendations from a followup item
   */
  static async createRecommendationsFromFollowupItem(
    followupItemId: string,
    recommendations: string[]
  ): Promise<FollowupRecommendation[]> {
    const createdRecommendations: FollowupRecommendation[] = [];

    for (let i = 0; i < recommendations.length; i++) {
      const recommendation = recommendations[i].trim();
      if (recommendation) {
        const id = require('uuid').v4();
        await query(
          `INSERT INTO followup_item_recommendations 
           (id, followup_item_id, recommendation_text, recommendation_index, status) 
           VALUES (?, ?, ?, ?, 'pending')`,
          [id, followupItemId, recommendation, i]
        );

        const created = await this.getById(id);
        if (created) {
          createdRecommendations.push(created);
        }
      }
    }

    return createdRecommendations;
  }

  /**
   * Get recommendation by ID
   */
  static async getById(id: string): Promise<FollowupRecommendation | null> {
    const results = await query(
      'SELECT * FROM followup_item_recommendations WHERE id = ?',
      [id]
    );

    return results.rows.length > 0 ? results.rows[0] as FollowupRecommendation : null;
  }

  /**
   * Get all recommendations for a followup item
   */
  static async getByFollowupItemId(followupItemId: string): Promise<FollowupRecommendation[]> {
    const results = await query(
      'SELECT * FROM followup_item_recommendations WHERE followup_item_id = ? ORDER BY recommendation_index',
      [followupItemId]
    );

    return results.rows as FollowupRecommendation[];
  }

  /**
   * Get all recommendations for multiple followup items (batch query)
   */
  static async getByFollowupItemIds(followupItemIds: string[]): Promise<FollowupRecommendation[]> {
    if (followupItemIds.length === 0) return [];
    
    const placeholders = followupItemIds.map(() => '?').join(',');
    const results = await query(
      `SELECT * FROM followup_item_recommendations 
       WHERE followup_item_id IN (${placeholders}) 
       ORDER BY followup_item_id, recommendation_index`,
      followupItemIds
    );

    return results.rows as FollowupRecommendation[];
  }

  /**
   * Update recommendation response and status
   */
  static async updateResponse(
    id: string,
    response: string,
    status: 'submitted' = 'submitted'
  ): Promise<void> {
    await query(
      `UPDATE followup_item_recommendations 
       SET opd_response = ?, status = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [response, status, id]
    );
  }

  /**
   * Update recommendation status
   */
  static async updateStatus(
    id: string,
    status: 'pending' | 'submitted' | 'approved' | 'rejected',
    adminNotes?: string
  ): Promise<void> {
    const sql = adminNotes 
      ? `UPDATE followup_item_recommendations 
         SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`
      : `UPDATE followup_item_recommendations 
         SET status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`;
    
    const params = adminNotes ? [status, adminNotes, id] : [status, id];
    
    await query(sql, params);
  }

  /**
   * Delete recommendation
   */
  static async delete(id: string): Promise<void> {
    await query('DELETE FROM followup_item_recommendations WHERE id = ?', [id]);
  }

  /**
   * Get all recommendations for a report (across all followup items)
   */
  static async getByReportId(reportId: string): Promise<FollowupRecommendation[]> {
    const results = await query(`
      SELECT fir.* 
      FROM followup_item_recommendations fir
      INNER JOIN followup_items fi ON fi.id = fir.followup_item_id
      WHERE fi.report_id = ?
      ORDER BY fi.created_at, fir.recommendation_index
    `, [reportId]);

    return results.rows as FollowupRecommendation[];
  }
}

export class FollowupRecommendationFileModel {
  /**
   * Create file record
   */
  static async create(data: {
    recommendation_id: string;
    original_name: string;
    stored_name: string;
    file_path: string;
    file_size: number;
    uploaded_by: string;
  }): Promise<FollowupRecommendationFile> {
    const id = require('uuid').v4();
    await query(
      `INSERT INTO followup_recommendation_files 
       (id, recommendation_id, original_name, stored_name, file_path, file_size, uploaded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.recommendation_id,
        data.original_name,
        data.stored_name,
        data.file_path,
        data.file_size,
        data.uploaded_by
      ]
    );

    const created = await this.getById(id);
    if (!created) {
      throw new Error('Failed to create file record');
    }

    return created;
  }

  /**
   * Get file by ID
   */
  static async getById(id: string): Promise<FollowupRecommendationFile | null> {
    const results = await query(
      'SELECT * FROM followup_recommendation_files WHERE id = ?',
      [id]
    );

    return results.rows.length > 0 ? results.rows[0] as FollowupRecommendationFile : null;
  }

  /**
   * Get files by recommendation ID
   */
  static async getByRecommendationId(recommendationId: string): Promise<FollowupRecommendationFile[]> {
    const results = await query(
      'SELECT * FROM followup_recommendation_files WHERE recommendation_id = ? ORDER BY uploaded_at DESC',
      [recommendationId]
    );

    return results.rows as FollowupRecommendationFile[];
  }

  /**
   * Delete file
   */
  static async delete(id: string): Promise<void> {
    await query('DELETE FROM followup_recommendation_files WHERE id = ?', [id]);
  }

  /**
   * Delete all files for a recommendation
   */
  static async deleteByRecommendationId(recommendationId: string): Promise<void> {
    await query('DELETE FROM followup_recommendation_files WHERE recommendation_id = ?', [recommendationId]);
  }
}