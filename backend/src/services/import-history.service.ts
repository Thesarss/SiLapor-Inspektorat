import { ImportSummary, ImportRecord, ImportDetails, ColumnMapping, ParsedData, Report } from '../types';
import { FileImportModel, ImportedReportModel, ImportErrorModel } from '../models/file-import.model';
import { ReportModel } from '../models/report.model';
import { UserModel } from '../models/user.model';
import * as fs from 'fs';
import * as path from 'path';

export class ImportHistoryService {
  /**
   * Record import event
   * Feature: file-import, Property 12: Import history recording
   */
  static async recordImport(
    summary: ImportSummary,
    mapping: ColumnMapping,
    fileName: string,
    filePath: string,
    fileType: 'xlsx' | 'xls' | 'csv'
  ): Promise<string> {
    const importRecord = await FileImportModel.create({
      admin_id: summary.adminId,
      file_name: fileName,
      file_path: filePath,
      file_type: fileType,
      column_mapping: mapping,
      total_rows: summary.totalRows,
      success_count: summary.successCount,
      failure_count: summary.failureCount,
      duplicate_count: summary.duplicateCount,
      status: 'completed'
    });

    return importRecord.id;
  }

  /**
   * Get import history
   * Feature: file-import, Property 13: Import history retrieval
   */
  static async getImportHistory(limit = 50, offset = 0): Promise<ImportRecord[]> {
    const imports = await FileImportModel.getAll(limit, offset);

    const records: ImportRecord[] = [];
    for (const imp of imports) {
      const admin = await UserModel.findById(imp.admin_id);
      records.push({
        id: imp.id,
        adminId: imp.admin_id,
        adminName: admin?.name || 'Unknown',
        timestamp: imp.created_at,
        totalRows: imp.total_rows,
        successCount: imp.success_count,
        failureCount: imp.failure_count,
        duplicateCount: imp.duplicate_count
      });
    }

    return records;
  }

  /**
   * Get import history by admin
   */
  static async getImportHistoryByAdmin(adminId: string, limit = 50, offset = 0): Promise<ImportRecord[]> {
    const imports = await FileImportModel.getByAdminId(adminId, limit, offset);

    const records: ImportRecord[] = [];
    for (const imp of imports) {
      const admin = await UserModel.findById(imp.admin_id);
      records.push({
        id: imp.id,
        adminId: imp.admin_id,
        adminName: admin?.name || 'Unknown',
        timestamp: imp.created_at,
        totalRows: imp.total_rows,
        successCount: imp.success_count,
        failureCount: imp.failure_count,
        duplicateCount: imp.duplicate_count
      });
    }

    return records;
  }

  /**
   * Get import details
   * Feature: file-import, Property 13: Import history retrieval
   */
  static async getImportDetails(importId: string): Promise<ImportDetails | null> {
    const fileImport = await FileImportModel.getById(importId);
    if (!fileImport) return null;

    const admin = await UserModel.findById(fileImport.admin_id);
    const importedReports = await ImportedReportModel.getByImportId(importId);
    const importErrors = await ImportErrorModel.getByImportId(importId);

    // Get created reports
    const createdReports: Report[] = [];
    for (const imported of importedReports) {
      const report = await ReportModel.findById(imported.report_id);
      if (report) {
        createdReports.push(report);
      }
    }

    // Convert errors to failed rows
    const failedRows = importErrors.map(err => ({
      rowNumber: err.row_number,
      reason: err.error_message
    }));

    const record: ImportRecord = {
      id: fileImport.id,
      adminId: fileImport.admin_id,
      adminName: admin?.name || 'Unknown',
      timestamp: fileImport.created_at,
      totalRows: fileImport.total_rows,
      successCount: fileImport.success_count,
      failureCount: fileImport.failure_count,
      duplicateCount: fileImport.duplicate_count
    };

    return {
      record,
      mapping: fileImport.column_mapping,
      originalData: {
        headers: Object.keys(fileImport.column_mapping),
        rows: importedReports.map(ir => ir.original_data),
        totalRows: fileImport.total_rows
      },
      createdReports,
      failedRows
    };
  }

  /**
   * Download import report as JSON
   */
  static async downloadImportReport(importId: string): Promise<Buffer> {
    const details = await this.getImportDetails(importId);
    if (!details) {
      throw new Error('Import tidak ditemukan');
    }

    const report = {
      importId,
      timestamp: details.record.timestamp,
      admin: details.record.adminName,
      summary: {
        totalRows: details.record.totalRows,
        successCount: details.record.successCount,
        failureCount: details.record.failureCount,
        duplicateCount: details.record.duplicateCount
      },
      mapping: details.mapping,
      createdReports: details.createdReports.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        assignedTo: r.assigned_to,
        status: r.status
      })),
      failedRows: details.failedRows
    };

    return Buffer.from(JSON.stringify(report, null, 2), 'utf-8');
  }

  /**
   * Download import report as CSV
   */
  static async downloadImportReportCSV(importId: string): Promise<Buffer> {
    const details = await this.getImportDetails(importId);
    if (!details) {
      throw new Error('Import tidak ditemukan');
    }

    let csv = 'Import Report\n';
    csv += `Import ID,${importId}\n`;
    csv += `Timestamp,${details.record.timestamp}\n`;
    csv += `Admin,${details.record.adminName}\n`;
    csv += `Total Rows,${details.record.totalRows}\n`;
    csv += `Success Count,${details.record.successCount}\n`;
    csv += `Failure Count,${details.record.failureCount}\n`;
    csv += `Duplicate Count,${details.record.duplicateCount}\n\n`;

    csv += 'Created Reports\n';
    csv += 'Report ID,Title,Status\n';
    for (const report of details.createdReports) {
      csv += `"${report.id}","${report.title}","${report.status}"\n`;
    }

    csv += '\nFailed Rows\n';
    csv += 'Row Number,Reason\n';
    for (const failed of details.failedRows) {
      csv += `${failed.rowNumber},"${failed.reason}"\n`;
    }

    return Buffer.from(csv, 'utf-8');
  }
}
