import { ImportRow, ImportResult, FailedRow, ImportSummary } from '../types';
import { ReportModel } from '../models/report.model';
import { UserModel } from '../models/user.model';
import { ImportedReportModel, ImportErrorModel } from '../models/file-import.model';
import { FollowupItemModel } from '../models/followup-item.model';
import { FollowupRecommendationModel } from '../models/followup-recommendation.model';
import { EmailService } from './email.service';
import { DataValidationService } from './data-validation.service';

export class ReportCreatorService {
  /**
   * Create ONE main report from imported data with all findings as details
   * Feature: file-import, Property 8: Report creation from valid rows
   * Feature: file-import, Property 9: Report assignment to OPD
   * Feature: file-import, Property 10: Email notification on import
   */
  static async createReportsFromImport(
    rows: ImportRow[],
    adminId: string,
    importId: string,
    fileName: string,
    targetOPD?: { id: string; name: string; institution: string; email: string }
  ): Promise<ImportResult> {
    const createdReports: string[] = [];
    const failedRows: FailedRow[] = [];

    try {
      // Filter meaningful rows first
      const meaningfulRows = DataValidationService.filterMeaningfulRows(rows);
      
      if (meaningfulRows.length === 0) {
        throw new Error('Tidak ada data yang valid ditemukan dalam file');
      }

      // If target OPD is specified, assign all reports to that OPD
      if (targetOPD) {
        console.log(`Creating report for target OPD: ${targetOPD.name} (${targetOPD.institution})`);
        
        // Create single report for target OPD
        const reportTitle = `Laporan Import: ${fileName} - ${targetOPD.institution}`;
        const reportDescription = this.createMainDescription(meaningfulRows, fileName, targetOPD.institution);

        const report = await ReportModel.create(
          reportTitle,
          reportDescription,
          adminId,
          targetOPD.id // Assign to selected OPD user
        );

        // Update nomor_lhp if provided, with better duplicate handling
        const firstNomorLHP = meaningfulRows.find(row => row.nomorLHP && row.nomorLHP.trim() !== '')?.nomorLHP;
        if (firstNomorLHP) {
          await this.updateReportNomorLHP(report.id, firstNomorLHP.trim());
        }

        // Create import details for ALL rows first (before grouping)
        const allImportDetailIds: string[] = [];
        for (let i = 0; i < meaningfulRows.length; i++) {
          const row = meaningfulRows[i];
          const rowNumber = i + 2; // +2 because header is row 1, data starts from row 2

          try {
            const importedReport = await ImportedReportModel.create({
              import_id: importId,
              report_id: report.id,
              row_number: rowNumber,
              original_data: row
            });
            allImportDetailIds.push(importedReport.id);
          } catch (error) {
            console.error(`Gagal record detail row ${rowNumber}:`, error);
          }
        }

        // Group rows by temuan for better organization
        const groupedByTemuan = this.groupRowsByTemuan(meaningfulRows);

        // Create grouped followup items
        for (const [temuan, temuanRows] of groupedByTemuan) {
          // Create one followup item per temuan with multiple recommendations
          const rekomendasi = temuanRows.map(row => row.rekomendasi).join('\n\n');
          const tindakLanjut = temuanRows.map(row => row.tindakLanjut).filter(tl => tl && tl.trim()).join('\n\n');
          
          // Use first import detail from this group as reference
          const firstRowIndex = meaningfulRows.findIndex(r => r.temuan === temuan);
          const referenceImportDetailId = allImportDetailIds[firstRowIndex];

          // Create one followup item for this temuan with all recommendations
          if (referenceImportDetailId) {
            try {
              const followupItem = await FollowupItemModel.create({
                report_id: report.id,
                import_detail_id: referenceImportDetailId,
                temuan: temuan,
                rekomendasi: rekomendasi,
                tindak_lanjut: tindakLanjut || undefined,
                status: 'pending'
              });

              // Create individual recommendations for slide-down UI
              const rekomendasiList = temuanRows.map(row => row.rekomendasi).filter(r => r && r.trim());
              if (rekomendasiList.length > 0) {
                await FollowupRecommendationModel.createRecommendationsFromFollowupItem(
                  followupItem.id,
                  rekomendasiList
                );
              }
            } catch (error) {
              console.error(`Gagal create followup item untuk temuan: ${temuan}:`, error);
            }
          }
        }

        createdReports.push(report.id);

        // Send email notification to target OPD user
        try {
          const opdUser = await UserModel.findById(targetOPD.id);
          if (opdUser) {
            await EmailService.sendReportNotification(opdUser, report);
          }
        } catch (emailError) {
          console.error(`Gagal kirim email ke ${targetOPD.email}:`, emailError);
        }

      } else {
        // Original logic: Group rows by institution to create separate reports for each OPD
        const rowsByInstitution = new Map<string, ImportRow[]>();
        const unassignedRows: ImportRow[] = [];
        
        meaningfulRows.forEach(row => {
          const institution = row.institusiTujuan?.trim();
          if (institution) {
            if (!rowsByInstitution.has(institution)) {
              rowsByInstitution.set(institution, []);
            }
            rowsByInstitution.get(institution)!.push(row);
          } else {
            unassignedRows.push(row);
          }
        });

        // Create reports for each institution
        for (const [institution, institutionRows] of rowsByInstitution) {
          const opdUser = await UserModel.findByInstitution(institution);
          if (!opdUser) {
            console.warn(`Institusi Tujuan "${institution}" tidak ditemukan, assign ke admin`);
            // Add to unassigned if OPD user not found
            unassignedRows.push(...institutionRows);
            continue;
          }

          // Create report for this institution
          const reportTitle = `Laporan Import: ${fileName} - ${institution}`;
          const reportDescription = this.createMainDescription(institutionRows, fileName, institution);

          const institutionReport = await ReportModel.create(
            reportTitle,
            reportDescription,
            adminId,
            opdUser.id // Assign to specific OPD user
          );

          // Update nomor_lhp if provided, with better duplicate handling
          const firstNomorLHP = institutionRows.find(row => row.nomorLHP && row.nomorLHP.trim() !== '')?.nomorLHP;
          if (firstNomorLHP) {
            await this.updateReportNomorLHP(institutionReport.id, firstNomorLHP.trim());
          }

          // Group rows by temuan for better organization
          const groupedByTemuan = this.groupRowsByTemuan(institutionRows);

          // Record imported rows as details and create grouped followup items
          for (const [temuan, temuanRows] of groupedByTemuan) {
            // Create one followup item per temuan with multiple recommendations
            const rekomendasi = temuanRows.map(row => row.rekomendasi).join('\n\n');
            const tindakLanjut = temuanRows.map(row => row.tindakLanjut).filter(tl => tl && tl.trim()).join('\n\n');
            
            // Create import details for each row
            const importDetailIds: string[] = [];
            for (let i = 0; i < temuanRows.length; i++) {
              const row = temuanRows[i];
              const rowNumber = i + 2;

              try {
                const importedReport = await ImportedReportModel.create({
                  import_id: importId,
                  report_id: institutionReport.id,
                  row_number: rowNumber,
                  original_data: row
                });
                importDetailIds.push(importedReport.id);
              } catch (error) {
                console.error(`Gagal record detail row ${rowNumber}:`, error);
              }
            }

            // Create one followup item for this temuan with all recommendations
            if (importDetailIds.length > 0) {
              try {
                await FollowupItemModel.create({
                  report_id: institutionReport.id,
                  import_detail_id: importDetailIds[0], // Use first import detail as reference
                  temuan: temuan,
                  rekomendasi: rekomendasi,
                  tindak_lanjut: tindakLanjut || undefined,
                  status: 'pending'
                });
              } catch (error) {
                console.error(`Gagal create followup item untuk temuan: ${temuan}:`, error);
              }
            }
          }

          createdReports.push(institutionReport.id);

          // Send email notification to OPD user
          try {
            await EmailService.sendReportNotification(opdUser, institutionReport);
          } catch (emailError) {
            console.error(`Gagal kirim email ke ${opdUser.email}:`, emailError);
          }
        }

        // Create general report for unassigned rows (assign to admin)
        if (unassignedRows.length > 0) {
          const generalTitle = `Laporan Import: ${fileName} - Umum`;
          const generalDescription = this.createMainDescription(unassignedRows, fileName, 'Umum');

          const generalReport = await ReportModel.create(
            generalTitle,
            generalDescription,
            adminId,
            adminId // Assign to admin
          );

          // Update nomor_lhp if provided, with better duplicate handling
          const firstNomorLHP = unassignedRows.find(row => row.nomorLHP && row.nomorLHP.trim() !== '')?.nomorLHP;
          if (firstNomorLHP) {
            await this.updateReportNomorLHP(generalReport.id, firstNomorLHP.trim());
          }

          // Group rows by temuan for better organization
          const groupedByTemuan = this.groupRowsByTemuan(unassignedRows);

          // Record imported rows as details and create grouped followup items
          for (const [temuan, temuanRows] of groupedByTemuan) {
            // Create one followup item per temuan with multiple recommendations
            const rekomendasi = temuanRows.map(row => row.rekomendasi).join('\n\n');
            const tindakLanjut = temuanRows.map(row => row.tindakLanjut).filter(tl => tl && tl.trim()).join('\n\n');
            
            // Create import details for each row
            const importDetailIds: string[] = [];
            for (let i = 0; i < temuanRows.length; i++) {
              const row = temuanRows[i];
              const rowNumber = i + 2;

              try {
                const importedReport = await ImportedReportModel.create({
                  import_id: importId,
                  report_id: generalReport.id,
                  row_number: rowNumber,
                  original_data: row
                });
                importDetailIds.push(importedReport.id);
              } catch (error) {
                console.error(`Gagal record detail row ${rowNumber}:`, error);
              }
            }

            // Create one followup item for this temuan with all recommendations
            if (importDetailIds.length > 0) {
              try {
                await FollowupItemModel.create({
                  report_id: generalReport.id,
                  import_detail_id: importDetailIds[0], // Use first import detail as reference
                  temuan: temuan,
                  rekomendasi: rekomendasi,
                  tindak_lanjut: tindakLanjut || undefined,
                  status: 'pending'
                });
              } catch (error) {
                console.error(`Gagal create followup item untuk temuan: ${temuan}:`, error);
              }
            }
          }

          createdReports.push(generalReport.id);
        }
      }

    } catch (error) {
      failedRows.push({
        rowNumber: 1,
        reason: error instanceof Error ? error.message : String(error)
      });

      // Record error
      try {
        await ImportErrorModel.create({
          import_id: importId,
          row_number: 1,
          error_message: error instanceof Error ? error.message : String(error),
          row_data: { error: 'Failed to create main report' }
        });
      } catch (recordError) {
        console.error('Gagal record error:', recordError);
      }
    }

    const endTime = new Date();

    // Create summary
    // Feature: file-import, Property 11: Import summary accuracy
    const summary: ImportSummary = {
      totalRows: rows.length,
      successCount: createdReports.length,
      failureCount: failedRows.length,
      duplicateCount: 0, // Duplicates sudah di-filter di validation
      timestamp: endTime,
      adminId
    };

    return {
      importId,
      createdReports,
      failedRows,
      summary
    };
  }

  /**
   * Group rows by temuan to combine multiple recommendations for same finding
   */
  private static groupRowsByTemuan(rows: ImportRow[]): Map<string, ImportRow[]> {
    const grouped = new Map<string, ImportRow[]>();
    
    for (const row of rows) {
      const temuan = String(row.temuan || '').trim();
      
      if (!temuan) {
        continue;
      }
      
      if (!grouped.has(temuan)) {
        grouped.set(temuan, []);
      }
      grouped.get(temuan)!.push(row);
    }
    
    return grouped;
  }

  /**
   * Create main description from all meaningful findings
   */
  private static createMainDescription(rows: ImportRow[], fileName: string, institution?: string): string {
    // Use the rows as-is since they're already filtered by DataValidationService.filterMeaningfulRows
    const meaningfulFindings = rows;

    let description = `Laporan hasil import dari file: ${fileName}`;
    if (institution) {
      description += ` untuk ${institution}`;
    }
    description += `\n\nTotal temuan yang valid: ${meaningfulFindings.length}\n\n`;
    
    if (meaningfulFindings.length > 0) {
      description += `Ringkasan temuan:\n`;
      meaningfulFindings.slice(0, 3).forEach((row, index) => {
        const temuan = String(row.temuan || '').trim();
        const shortTemuan = temuan.length > 100 ? temuan.substring(0, 100) + '...' : temuan;
        description += `${index + 1}. ${shortTemuan}\n`;
      });
      
      if (meaningfulFindings.length > 3) {
        description += `... dan ${meaningfulFindings.length - 3} temuan lainnya.\n`;
      }
      
      description += `\nSilakan lihat detail laporan untuk melihat semua temuan dan rekomendasi.`;
    }

    return description;
  }

  /**
   * Update nomor_lhp di report dengan handling duplikasi yang lebih robust
   */
  private static async updateReportNomorLHP(reportId: string, nomorLHP: string): Promise<void> {
    try {
      const { query } = require('../config/database');
      
      // First, try to update with original nomor_lhp
      try {
        await query('UPDATE reports SET nomor_lhp = ? WHERE id = ?', [nomorLHP, reportId]);
        console.log(`Successfully updated nomor_lhp: ${nomorLHP} for report: ${reportId}`);
      } catch (error: any) {
        // If duplicate entry error, create unique nomor_lhp with multiple fallback strategies
        if (error.code === 'ER_DUP_ENTRY' || (error.message && error.message.includes('Duplicate entry'))) {
          console.warn(`Nomor LHP ${nomorLHP} sudah ada, mencoba membuat unique...`);
          
          let attempts = 0;
          let success = false;
          
          while (!success && attempts < 5) {
            attempts++;
            const timestamp = Date.now() + attempts; // Add attempts to ensure uniqueness
            const uniqueNomorLHP = `${nomorLHP}_${timestamp}`;
            
            try {
              await query('UPDATE reports SET nomor_lhp = ? WHERE id = ?', [uniqueNomorLHP, reportId]);
              console.log(`Successfully updated with unique nomor_lhp: ${uniqueNomorLHP} for report: ${reportId}`);
              success = true;
            } catch (retryError: any) {
              if (retryError.code === 'ER_DUP_ENTRY') {
                console.warn(`Attempt ${attempts}: ${uniqueNomorLHP} juga duplikat, mencoba lagi...`);
                // Continue to next attempt
              } else {
                throw retryError;
              }
            }
          }
          
          if (!success) {
            console.error(`Gagal update nomor_lhp setelah ${attempts} percobaan, skip update nomor_lhp untuk report ${reportId}`);
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`Gagal update nomor_lhp untuk report ${reportId}:`, error);
      // Don't throw error, just log it - nomor_lhp is not critical for report creation
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
    const { FileImportModel } = await import('../models/file-import.model');
    const fileImport = await FileImportModel.getById(importId);
    if (!fileImport) {
      throw new Error('Import tidak ditemukan');
    }

    // Get failed rows
    const { ImportErrorModel } = await import('../models/file-import.model');
    const errors = await ImportErrorModel.getByImportId(importId);

    if (errors.length === 0) {
      throw new Error('Tidak ada failed rows untuk di-retry');
    }

    // Extract failed rows data
    const failedRows: ImportRow[] = errors.map((err: any) => err.row_data);

    // Retry creating reports
    const importResult = await this.createReportsFromImport(
      failedRows,
      adminId,
      importId,
      fileImport.file_name
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
