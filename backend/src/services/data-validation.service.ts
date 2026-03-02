import { ImportRow, ValidationReport, ValidationError, DuplicateError } from '../types';
import { ReportModel } from '../models/report.model';
import { UserModel } from '../models/user.model';

export class DataValidationService {
  /**
   * Process rows with continuation logic
   * If a row has empty temuan but has rekomendasi, it continues the previous temuan
   */
  static processRowsWithContinuation(rows: ImportRow[]): ImportRow[] {
    const processedRows: ImportRow[] = [];
    let currentTemuan = '';
    let currentPenyebab = '';
    let currentNomorLHP = '';
    let currentTanggalLHP = '';
    let currentInstitusiTujuan = '';
    let currentTindakLanjut = '';
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const temuan = String(row.temuan || '').trim();
      const rekomendasi = String(row.rekomendasi || '').trim();
      const penyebab = String(row.penyebab || '').trim();
      const nomorLHP = String(row.nomorLHP || '').trim();
      const tanggalLHP = row.tanggalLHP ? String(row.tanggalLHP).trim() : '';
      const institusiTujuan = String(row.institusiTujuan || '').trim();
      const tindakLanjut = String(row.tindakLanjut || '').trim();
      
      // Skip completely empty rows
      if (!temuan && !rekomendasi && !penyebab) {
        continue;
      }
      
      // If temuan is provided, update current temuan (new finding)
      if (temuan && temuan.length >= 3) {
        currentTemuan = temuan;
        currentPenyebab = penyebab || currentPenyebab;
        currentNomorLHP = nomorLHP || currentNomorLHP;
        currentTanggalLHP = tanggalLHP || currentTanggalLHP;
        currentInstitusiTujuan = institusiTujuan || currentInstitusiTujuan;
        currentTindakLanjut = tindakLanjut || currentTindakLanjut;
      }
      
      // If rekomendasi is provided, create a row (either new finding or continuation)
      if (rekomendasi && rekomendasi.length >= 3) {
        // Use current temuan (either from this row or previous row)
        const finalTemuan = temuan || currentTemuan;
        
        if (finalTemuan && finalTemuan.length >= 3) {
          processedRows.push({
            nomorLHP: nomorLHP || currentNomorLHP,
            tanggalLHP: tanggalLHP || currentTanggalLHP,
            temuan: finalTemuan,
            penyebab: penyebab || currentPenyebab,
            rekomendasi: rekomendasi,
            tindakLanjut: tindakLanjut || currentTindakLanjut,
            institusiTujuan: institusiTujuan || currentInstitusiTujuan
          });
        }
      }
    }
    
    return processedRows;
  }

  /**
   * Filter rows to get only meaningful data
   * Skip empty rows, placeholder codes, and rows with only numbers
   */
  static filterMeaningfulRows(rows: ImportRow[]): ImportRow[] {
    // First process continuation logic
    const processedRows = this.processRowsWithContinuation(rows);
    
    return processedRows.filter(row => {
      const temuan = String(row.temuan || '').trim();
      const rekomendasi = String(row.rekomendasi || '').trim();
      
      // Skip completely empty rows
      if (!temuan && !rekomendasi) {
        return false;
      }
      
      // Skip placeholder codes like <0810>, <1006>
      const isPlaceholderCode = (value: string) => {
        return /^<\d+>$/.test(value.trim());
      };
      
      // Skip rows with only placeholder codes
      if (isPlaceholderCode(temuan) || isPlaceholderCode(rekomendasi)) {
        return false;
      }
      
      // Skip rows with only numbers in both fields
      const isOnlyNumbers = (value: string) => {
        return /^\d+$/.test(value.trim());
      };
      
      if (isOnlyNumbers(temuan) || isOnlyNumbers(rekomendasi)) {
        return false;
      }
      
      // Skip rows with very short content (likely headers or placeholders)
      if (temuan.length < 10 || rekomendasi.length < 10) {
        return false;
      }
      
      // Skip common placeholder text
      const isPlaceholderText = (value: string) => {
        const lower = value.toLowerCase();
        return lower === 'temuan' || 
               lower === 'rekomendasi' || 
               lower === 'penyebab' ||
               lower === 'tindak lanjut' ||
               lower === 'institusi tujuan';
      };
      
      if (isPlaceholderText(temuan) || isPlaceholderText(rekomendasi)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Validate multiple rows
   * Feature: file-import, Property 5: Empty field detection
   * Feature: file-import, Property 6: OPD user validation
   * Feature: file-import, Property 7: Duplicate detection by Nomor LHP
   */
  static async validateRows(rows: ImportRow[]): Promise<ValidationReport> {
    // First filter meaningful rows
    const meaningfulRows = this.filterMeaningfulRows(rows);
    
    const invalidRows: ValidationError[] = [];
    const duplicateRows: DuplicateError[] = [];
    let validCount = 0;

    for (let i = 0; i < meaningfulRows.length; i++) {
      const row = meaningfulRows[i];
      const rowNumber = i + 2; // +2 karena header di row 1, data mulai dari row 2

      // Validate single row
      const rowValidation = await this.validateRow(row, rowNumber);

      if (rowValidation.errors.length > 0) {
        invalidRows.push({
          rowNumber,
          errors: rowValidation.errors
        });
      } else if (rowValidation.isDuplicate) {
        duplicateRows.push({
          rowNumber,
          nomorLHP: row.nomorLHP,
          existingReportId: rowValidation.existingReportId || ''
        });
      } else {
        validCount++;
      }
    }

    return {
      totalRows: meaningfulRows.length, // Return count of meaningful rows only
      validRows: validCount,
      invalidRows,
      duplicateRows
    };
  }

  /**
   * Validate single row
   */
  static async validateRow(
    row: ImportRow,
    rowNumber: number
  ): Promise<{
    errors: string[];
    isDuplicate: boolean;
    existingReportId?: string;
  }> {
    const errors: string[] = [];
    let isDuplicate = false;
    let existingReportId: string | undefined;

    // Normalize values to strings and check for meaningful content
    const temuan = String(row.temuan || '').trim();
    const rekomendasi = String(row.rekomendasi || '').trim();
    const institusiTujuan = String(row.institusiTujuan || '').trim();

    // More lenient validation - accept any non-empty content
    if (!temuan || temuan.length < 3) {
      errors.push('Temuan harus diisi dengan minimal 3 karakter');
    }
    
    if (!rekomendasi || rekomendasi.length < 3) {
      errors.push('Rekomendasi harus diisi dengan minimal 3 karakter');
    }

    // If there are empty field errors, return early
    if (errors.length > 0) {
      return { errors, isDuplicate: false };
    }

    // Check OPD user existence only if institusiTujuan is provided
    // Feature: file-import, Property 6: OPD user validation
    if (institusiTujuan) {
      try {
        const opdUser = await UserModel.findByInstitution(institusiTujuan);
        if (!opdUser) {
          errors.push(`Institusi Tujuan "${institusiTujuan}" tidak ditemukan dalam sistem`);
        }
      } catch (error) {
        errors.push(`Gagal validasi Institusi Tujuan: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // If there are validation errors, return early
    if (errors.length > 0) {
      return { errors, isDuplicate: false };
    }

    // Check duplicate Nomor LHP
    // Feature: file-import, Property 7: Duplicate detection by Nomor LHP
    const nomorLHP = String(row.nomorLHP || '').trim();
    if (nomorLHP) {
      try {
        const existingReport = await ReportModel.findByNomorLHP(nomorLHP);
        if (existingReport) {
          isDuplicate = true;
          existingReportId = existingReport.id;
          // Don't add to errors array - duplicates are handled separately
        }
      } catch (error) {
        errors.push(`Gagal cek duplikasi: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { errors, isDuplicate, existingReportId };
  }
}
