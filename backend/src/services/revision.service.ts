import { RevisionModel, RevisionItem, RevisionFile } from '../models/revision.model';
import { ReportModel } from '../models/report.model';
import * as fs from 'fs';
import * as path from 'path';

export const RevisionService = {
  async createRevisionItems(reportId: string, descriptions: string[]): Promise<RevisionItem[]> {
    const report = await ReportModel.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const items: RevisionItem[] = [];
    for (let i = 0; i < descriptions.length; i++) {
      const item = await RevisionModel.createItem(reportId, i + 1, descriptions[i]);
      items.push(item);
    }

    // Update report status to needs_revision
    await ReportModel.updateStatus(reportId, 'needs_revision');

    return items;
  },

  async getRevisionItemsByReport(reportId: string): Promise<RevisionItem[]> {
    return RevisionModel.findItemsByReport(reportId);
  },

  async getRevisionItemWithFiles(itemId: string): Promise<{ item: RevisionItem; files: RevisionFile[] } | null> {
    const item = await RevisionModel.findItemById(itemId);
    if (!item) return null;

    const files = await RevisionModel.findFilesByRevisionItem(itemId);
    return { item, files };
  },

  async submitRevisionResponse(
    itemId: string,
    userResponse: string
  ): Promise<RevisionItem | null> {
    const item = await RevisionModel.findItemById(itemId);
    if (!item) {
      throw new Error('Revision item not found');
    }

    if (item.status !== 'pending') {
      throw new Error('Revision item is not pending');
    }

    return RevisionModel.updateItemResponse(itemId, userResponse, 'completed');
  },

  async uploadRevisionFile(
    itemId: string,
    file: Express.Multer.File
  ): Promise<RevisionFile> {
    const item = await RevisionModel.findItemById(itemId);
    if (!item) {
      throw new Error('Revision item not found');
    }

    const uploadsDir = path.join(__dirname, '../../uploads/revisions');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const storedName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadsDir, storedName);
    
    fs.writeFileSync(filePath, file.buffer);

    return RevisionModel.createFile(
      itemId,
      file.originalname,
      storedName,
      filePath,
      file.size
    );
  },

  async approveRevisionItem(itemId: string, adminNotes?: string): Promise<RevisionItem | null> {
    const item = await RevisionModel.findItemById(itemId);
    if (!item) {
      throw new Error('Revision item not found');
    }

    if (item.status !== 'completed') {
      throw new Error('Revision item must be completed before approval');
    }

    const updatedItem = await RevisionModel.updateItemStatus(itemId, 'approved', adminNotes);

    // Check if all revision items for this report are approved
    const allItems = await RevisionModel.findItemsByReport(item.report_id);
    const allApproved = allItems.every(i => i.status === 'approved');

    if (allApproved) {
      // If all revision items are approved, approve the report
      await ReportModel.updateStatus(item.report_id, 'approved');
    }

    return updatedItem;
  },

  async rejectRevisionItem(itemId: string, adminNotes: string): Promise<RevisionItem | null> {
    const item = await RevisionModel.findItemById(itemId);
    if (!item) {
      throw new Error('Revision item not found');
    }

    // Reset to pending so user can resubmit
    return RevisionModel.updateItemStatus(itemId, 'pending', adminNotes);
  },

  async deleteRevisionItems(reportId: string): Promise<boolean> {
    return RevisionModel.deleteItemsByReport(reportId);
  },

  async getRevisionFileById(fileId: string): Promise<RevisionFile | null> {
    return RevisionModel.findFileById(fileId);
  },
};
