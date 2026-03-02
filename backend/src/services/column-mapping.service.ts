import { ColumnMapping, MappedData, ImportRow, MappingError, ParsedData } from '../types';

export class ColumnMappingService {
  // Define required fields - hanya temuan dan rekomendasi yang wajib
  private static readonly REQUIRED_FIELDS = ['temuan', 'rekomendasi'];

  /**
   * Validate column mapping
   * Feature: file-import, Property 4: Required fields mapping validation
   */
  static validateMapping(mapping: ColumnMapping): { valid: boolean; errors?: string[] } {
    if (!mapping || typeof mapping !== 'object') {
      return { valid: false, errors: ['Mapping tidak valid'] };
    }

    const errors: string[] = [];
    const mappedFields = Object.keys(mapping);

    // Check if all required fields are mapped
    for (const requiredField of this.REQUIRED_FIELDS) {
      if (!mappedFields.includes(requiredField)) {
        errors.push(`Field wajib '${requiredField}' belum dimapping`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * Apply mapping ke data
   * Transform file columns ke system fields
   */
  static applyMapping(data: ParsedData, mapping: ColumnMapping): MappedData {
    const mappedRows: ImportRow[] = [];
    const errors: MappingError[] = [];

    for (let rowIndex = 0; rowIndex < data.rows.length; rowIndex++) {
      const row = data.rows[rowIndex];
      const rowNumber = rowIndex + 2; // +2 karena header di row 1, data mulai dari row 2

      // Skip empty rows - check if required fields (temuan, rekomendasi) are empty
      const mappedTemuan = row[mapping.temuan];
      const mappedRekomendasi = row[mapping.rekomendasi];
      
      // Debug logging
      console.log(`Row ${rowNumber}:`, {
        temuan: mappedTemuan,
        rekomendasi: mappedRekomendasi,
        temuanType: typeof mappedTemuan,
        rekomendasiType: typeof mappedRekomendasi,
        rawRow: row
      });
      
      // Check for placeholder codes like <0810>, <0903> etc
      const isPlaceholderCode = (value: any) => {
        if (!value) return false;
        const str = String(value).trim();
        return /^<\d+>$/.test(str); // Matches <digits>
      };
      
      // Check for placeholder text
      const isPlaceholderText = (value: any) => {
        if (!value) return false;
        const str = String(value).trim().toLowerCase();
        return str === 'temuan' || 
               str === 'rekomendasi' || 
               str === 'penyebab' ||
               str === 'tindak lanjut' ||
               str === 'institusi tujuan' ||
               str === 'nomor lhp' ||
               str === 'tanggal lhp';
      };
      
      // Check for only numbers
      const isOnlyNumbers = (value: any) => {
        if (!value) return false;
        const str = String(value).trim();
        return /^\d+$/.test(str);
      };
      
      // More robust empty check - skip placeholder codes, text, and numbers
      const temuanEmpty = mappedTemuan === null || 
                         mappedTemuan === undefined || 
                         String(mappedTemuan).trim() === '' ||
                         String(mappedTemuan).trim() === 'null' ||
                         String(mappedTemuan).trim() === 'undefined' ||
                         isPlaceholderCode(mappedTemuan) ||
                         isPlaceholderText(mappedTemuan) ||
                         isOnlyNumbers(mappedTemuan) ||
                         String(mappedTemuan).trim().length < 10; // Minimum meaningful length
                         
      const rekomendasiEmpty = mappedRekomendasi === null || 
                              mappedRekomendasi === undefined || 
                              String(mappedRekomendasi).trim() === '' ||
                              String(mappedRekomendasi).trim() === 'null' ||
                              String(mappedRekomendasi).trim() === 'undefined' ||
                              isPlaceholderCode(mappedRekomendasi) ||
                              isPlaceholderText(mappedRekomendasi) ||
                              isOnlyNumbers(mappedRekomendasi) ||
                              String(mappedRekomendasi).trim().length < 10; // Minimum meaningful length
      
      // Only skip if BOTH fields are completely empty
      if (temuanEmpty && rekomendasiEmpty) {
        console.log(`Skipping empty row ${rowNumber}`);
        continue; // Skip rows where both required fields are empty
      }
      
      // Allow rows with partial data - let validation service handle the errors

      try {
        const mappedRow = this.mapRow(row, mapping);
        mappedRows.push(mappedRow);
      } catch (error) {
        errors.push({
          rowNumber,
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }

    return {
      rows: mappedRows,
      errors
    };
  }

  /**
   * Map single row dari file columns ke system fields
   */
  private static mapRow(row: Record<string, any>, mapping: ColumnMapping): ImportRow {
    const mappedRow: Partial<ImportRow> = {};

    // Map each system field
    for (const [systemField, fileColumn] of Object.entries(mapping)) {
      const value = row[fileColumn];

      if (systemField === 'nomorLHP') {
        mappedRow.nomorLHP = String(value || '').trim();
      } else if (systemField === 'tanggalLHP') {
        mappedRow.tanggalLHP = this.parseDate(value);
      } else if (systemField === 'temuan') {
        mappedRow.temuan = String(value || '').trim();
      } else if (systemField === 'penyebab') {
        mappedRow.penyebab = String(value || '').trim();
      } else if (systemField === 'rekomendasi') {
        mappedRow.rekomendasi = String(value || '').trim();
      } else if (systemField === 'tindakLanjut') {
        mappedRow.tindakLanjut = String(value || '').trim();
      } else if (systemField === 'institusiTujuan') {
        mappedRow.institusiTujuan = String(value || '').trim();
      }
    }

    // Validate required fields are present and not empty
    const temuan = mappedRow.temuan || '';
    const rekomendasi = mappedRow.rekomendasi || '';
    
    // Check for placeholder codes like <0810>, <0903> etc
    const isPlaceholderCode = (value: string) => {
      return /^<\d+>$/.test(value.trim()); // Matches <digits>
    };
    
    // Accept placeholder codes as valid data
    const temuanValid = temuan && (temuan.trim().length > 0 || isPlaceholderCode(temuan));
    const rekomendasiValid = rekomendasi && (rekomendasi.trim().length > 0 || isPlaceholderCode(rekomendasi));
    
    // Allow rows where only one field is filled (will be handled in validation)
    // Don't throw error here, let validation service handle it
    if (!temuanValid && !rekomendasiValid) {
      throw new Error('Field wajib tidak lengkap setelah mapping');
    }

    return mappedRow as ImportRow;
  }

  /**
   * Parse date dari berbagai format
   */
  private static parseDate(value: any): Date {
    if (!value) {
      return new Date();
    }

    // Jika sudah Date object
    if (value instanceof Date) {
      return value;
    }

    // Jika number (Excel serial date)
    if (typeof value === 'number') {
      // Excel serial date: days since 1900-01-01
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (value - 1) * 24 * 60 * 60 * 1000);
      return date;
    }

    // Jika string, coba parse
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Default ke hari ini
    return new Date();
  }

  /**
   * Get list of available system fields
   */
  static getAvailableFields(): string[] {
    return [
      'nomorLHP',
      'tanggalLHP',
      'temuan',
      'penyebab',
      'rekomendasi',
      'tindakLanjut',
      'institusiTujuan'
    ];
  }

  /**
   * Get required fields
   */
  static getRequiredFields(): string[] {
    return this.REQUIRED_FIELDS;
  }

  /**
   * Auto-mapping berdasarkan nama kolom dari row 5
   * Menggunakan fuzzy matching untuk mencocokkan nama kolom dengan field sistem
   */
  static createAutoMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    
    // Mapping rules berdasarkan kata kunci dalam nama kolom
    const mappingRules: Record<string, string[]> = {
      nomorLHP: [
        'nomor lhp', 'no lhp', 'nomor_lhp', 'no_lhp', 'lhp',
        'nomor laporan', 'no laporan', 'nomor audit', 'no audit'
      ],
      tanggalLHP: [
        'tanggal lhp', 'tgl lhp', 'tanggal_lhp', 'tgl_lhp',
        'tanggal laporan', 'tgl laporan', 'tanggal audit', 'tgl audit',
        'date', 'tanggal'
      ],
      temuan: [
        'temuan', 'finding', 'permasalahan', 'masalah', 'kondisi',
        'hasil temuan', 'audit finding', 'temuan audit'
      ],
      penyebab: [
        'penyebab', 'cause', 'akar masalah', 'root cause', 'sebab',
        'faktor penyebab', 'penyebab masalah'
      ],
      rekomendasi: [
        'rekomendasi', 'recommendation', 'saran', 'usulan',
        'rekomendasi perbaikan', 'saran perbaikan', 'tindakan perbaikan'
      ],
      tindakLanjut: [
        'tindak lanjut', 'tindaklanjut', 'followup', 'follow up',
        'tindakan', 'action', 'langkah tindak lanjut', 'rencana tindak lanjut'
      ],
      institusiTujuan: [
        'institusi tujuan', 'institusi', 'opd', 'dinas', 'badan',
        'unit kerja', 'instansi', 'organisasi', 'lembaga'
      ]
    };

    // Untuk setiap field sistem, cari header yang paling cocok
    for (const [systemField, keywords] of Object.entries(mappingRules)) {
      let bestMatch = '';
      let bestScore = 0;

      for (const header of headers) {
        if (!header || header.trim() === '') continue;
        
        const headerLower = header.toLowerCase().trim();
        
        // Cari kecocokan dengan keywords
        for (const keyword of keywords) {
          const keywordLower = keyword.toLowerCase();
          let score = 0;

          // Exact match (skor tertinggi)
          if (headerLower === keywordLower) {
            score = 100;
          }
          // Contains keyword
          else if (headerLower.includes(keywordLower)) {
            score = 80;
          }
          // Keyword contains header
          else if (keywordLower.includes(headerLower)) {
            score = 60;
          }
          // Fuzzy match - check individual words
          else {
            const headerWords = headerLower.split(/\s+/);
            const keywordWords = keywordLower.split(/\s+/);
            
            let matchingWords = 0;
            for (const headerWord of headerWords) {
              for (const keywordWord of keywordWords) {
                if (headerWord === keywordWord || 
                    headerWord.includes(keywordWord) || 
                    keywordWord.includes(headerWord)) {
                  matchingWords++;
                  break;
                }
              }
            }
            
            if (matchingWords > 0) {
              score = (matchingWords / Math.max(headerWords.length, keywordWords.length)) * 40;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = header;
          }
        }
      }

      // Hanya gunakan match jika skor cukup tinggi
      if (bestScore >= 40 && bestMatch) {
        mapping[systemField] = bestMatch;
        console.log(`Auto-mapped ${systemField} -> ${bestMatch} (score: ${bestScore})`);
      }
    }

    // Pastikan field wajib ter-mapping
    const requiredFields = this.getRequiredFields();
    for (const requiredField of requiredFields) {
      if (!mapping[requiredField]) {
        console.warn(`Required field '${requiredField}' tidak ter-mapping otomatis`);
      }
    }

    return mapping;
  }
}
