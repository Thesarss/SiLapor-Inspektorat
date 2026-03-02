import { FollowUpModel } from '../models/followup.model';
import { ReportModel } from '../models/report.model';
import { FollowUp, CreateFollowUpDTO, UpdateFollowUpDTO } from '../types';
import { createError } from '../middleware/error.middleware';

export const FollowUpService = {
  async createFollowUp(data: CreateFollowUpDTO): Promise<FollowUp> {
    // Validate content is not empty
    if (!data.content || data.content.trim().length === 0) {
      throw createError('Tindak lanjut tidak boleh kosong', 400);
    }

    // Check if report exists
    const report = await ReportModel.findById(data.reportId);
    if (!report) {
      throw createError('Report not found', 404);
    }

    // Check if follow-up already exists for this report
    const existing = await FollowUpModel.findByReportId(data.reportId);
    if (existing) {
      throw createError('Follow-up already exists for this report', 400);
    }

    // Create follow-up
    const followUp = await FollowUpModel.create(data.reportId, data.userId, data.content);

    // Update report status to in_progress
    await ReportModel.updateStatus(data.reportId, 'in_progress');

    return followUp;
  },

  async updateFollowUp(id: string, data: UpdateFollowUpDTO): Promise<FollowUp> {
    const followUp = await FollowUpModel.findById(id);

    if (!followUp) {
      throw createError('Follow-up not found', 404);
    }

    // Check if can edit
    const canEdit = FollowUpModel.canEdit(followUp);
    if (!canEdit) {
      throw createError('Tindak lanjut sudah di-approve dan tidak dapat diedit', 403);
    }

    // Validate content if provided
    if (data.content !== undefined) {
      if (!data.content || data.content.trim().length === 0) {
        throw createError('Tindak lanjut tidak boleh kosong', 400);
      }
      const updated = await FollowUpModel.update(id, data.content);
      if (!updated) {
        throw createError('Failed to update follow-up', 500);
      }
      return updated;
    }

    return followUp;
  },

  async getFollowUpByReportId(reportId: string): Promise<FollowUp | null> {
    return FollowUpModel.findByReportId(reportId);
  },

  async getPendingFollowUps(): Promise<FollowUp[]> {
    return FollowUpModel.findPending();
  },

  canEdit(followUp: FollowUp): boolean {
    return followUp.status === 'pending_approval' || followUp.status === 'rejected';
  },
};
