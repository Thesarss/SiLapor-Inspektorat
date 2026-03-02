import * as fs from 'fs';
import { FileParserService } from './file-parser.service';
import { ColumnMappingService } from './column-mapping.service';
import { DataValidationService } from './data-validation.service';
import { ReportCreatorService } from './report-creator.service';
import { ImportHistoryService } from './import-history.service';
import { FileImportModel } from '../models/file-import.model';
import { ImportRow, ColumnMapping, FileType, ImportResult } from '../types';

export class ImportExecutionService {
  /**
   * Execute complete import process
   * Feature: file-import, Property 11: Import summary accuracy
   */
  static async executeImport(
    filePath: string,
    fileType: FileType,
    mapping: ColumnMapping,
    adminId: string,
    fileName: string,
    targetOPD?: { id: string; name: string; institution: string; email: string }
  ): Promise<ImportResult> {
    let importId: string | null = null;

    try {
      // Create import record
      const fileImport = await FileImportModel.create({
        admin_id: adminId,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        column_mapping: mapping,
        total_rows: 0,
        success_count: 0,
        failure_count: 0,
        duplicate_count: 0,
        status: 'processing'
      });

      importId = fileImport.id;

      // Step 1: Parse file
      const parsedData = await FileParserService.parseFile(filePath, fileType);

      // Update total rows
      await FileImportModel.update(importId, {
        total_rows: parsedData.totalRows
      });

      // Step 2: Apply mapping
      const mappedData = ColumnMappingService.applyMapping(parsedData, mapping);

      if (mappedData.errors.length > 0) {
        // Record mapping errors
        for (const error of mappedData.errors) {
          // These are mapping errors, not validation errors
          // We'll skip them for now
        }
      }

      // Step 3: Validate data
      const validationReport = await DataValidationService.validateRows(mappedData.rows);

      // Filter out duplicate rows before creating reports
      const validRows = mappedData.rows.filter((row, index) => {
        const rowNumber = index + 2; // +2 because header is row 1, data starts from row 2
        
        // Check if this row is in duplicateRows
        const isDuplicate = validationReport.duplicateRows.some(dup => dup.rowNumber === rowNumber);
        
        // Check if this row is in invalidRows
        const isInvalid = validationReport.invalidRows.some(inv => inv.rowNumber === rowNumber);
        
        return !isDuplicate && !isInvalid;
      });

      console.log(`Filtered rows: ${validRows.length} valid, ${validationReport.duplicateRows.length} duplicates, ${validationReport.invalidRows.length} invalid`);

      // Step 4: Create reports from valid rows only
      const importResult = await ReportCreatorService.createReportsFromImport(
        validRows, // Use filtered valid rows
        adminId,
        importId,
        fileName,
        targetOPD
      );

      // Step 5: Update import record with results
      await FileImportModel.update(importId, {
        status: 'completed',
        success_count: importResult.summary.successCount,
        failure_count: importResult.summary.failureCount,
        duplicate_count: validationReport.duplicateRows.length,
        completed_at: new Date()
      });

      // Step 6: Record import history
      await ImportHistoryService.recordImport(
        importResult.summary,
        mapping,
        fileName,
        filePath,
        fileType
      );

      return importResult;
    } catch (error) {
      // Update import record with error
      if (importId) {
        await FileImportModel.update(importId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          completed_at: new Date()
        });
      }

      throw error;
    } finally {
      // Clean up temporary file
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error('Gagal hapus file temporary:', cleanupError);
        }
      }
    }
  }

  /**
   * Retry failed rows dari import
   * Feature: file-import, Property 14: Partial import recovery
   */
  static async retryFailedRows(
    importId: string,
    adminId: string
  ): Promise<ImportResult> {
    // Get import details
    const fileImport = await FileImportModel.getById(importId);
    if (!fileImport) {
      throw new Error('Import tidak ditemukan');
    }

    // Get failed rows
    const { ImportErrorModel } = require('../models/file-import.model');
    const errors = await ImportErrorModel.getByImportId(importId);

    if (errors.length === 0) {
      throw new Error('Tidak ada failed rows untuk di-retry');
    }

    // Extract failed rows data
    const failedRows: ImportRow[] = errors.map((err: any) => err.row_data);

    // Retry creating reports
    const importResult = await ReportCreatorService.createReportsFromImport(
      failedRows,
      adminId,
      importId,
      fileImport.file_name,
      undefined // No target OPD for retry
    );

    // Update import record
    const updatedSuccessCount = fileImport.success_count + importResult.summary.successCount;
    const updatedFailureCount = fileImport.failure_count - importResult.summary.successCount + importResult.failedRows.length;

    await FileImportModel.update(importId, {
      success_count: updatedSuccessCount,
      failure_count: updatedFailureCount
    });

    // Delete processed errors
    for (const error of errors) {
      if (importResult.createdReports.length > 0) {
        // Only delete if we successfully created at least one report
        await ImportErrorModel.deleteByImportId(importId);
        break;
      }
    }

    return importResult;
  }
}
