import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { ParsedData } from '../types';

export interface MatrixItem {
  temuan: string;
  penyebab: string;
  rekomendasi: string;
  rowNumber: number;
}

export interface MatrixParseResult {
  success: boolean;
  items: MatrixItem[];
  totalItems: number;
  errors: string[];
  warnings: string[];
  detectedHeaders: {
    temuan?: string;
    penyebab?: string;
    rekomendasi?: string;
  };
}

export class MatrixParserService {
  /**
   * Parse Excel file untuk matrix audit dengan deteksi otomatis kolom
   */
  static async parseMatrixFile(filePath: string, useAutoMapping = true): Promise<MatrixParseResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File tidak ditemukan: ${filePath}`);
    }

    try {
      if (useAutoMapping) {
        return this.parseWithAutoMapping(filePath);
      } else {
        return this.parseWithManualMapping(filePath);
      }
    } catch (error) {
      throw new Error(`Gagal parsing matrix file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse dengan deteksi otomatis kolom Temuan, Penyebab, Rekomendasi
   */
  private static parseWithAutoMapping(filePath: string): MatrixParseResult {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('File Excel tidak memiliki sheet');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    if (rawData.length < 2) {
      throw new Error('File Excel harus memiliki minimal 2 baris (header + data)');
    }

    // Cari header row dengan mencari baris yang mengandung kata kunci
    let headerRowIndex = -1;
    let detectedHeaders = {};

    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      const headerMap = this.detectMatrixHeaders(row);
      
      if (headerMap.temuan !== -1 && headerMap.rekomendasi !== -1) {
        headerRowIndex = i;
        detectedHeaders = {
          temuan: row[headerMap.temuan],
          penyebab: headerMap.penyebab !== -1 ? row[headerMap.penyebab] : undefined,
          rekomendasi: row[headerMap.rekomendasi]
        };
        break;
      }
    }

    if (headerRowIndex === -1) {
      return {
        success: false,
        items: [],
        totalItems: 0,
        errors: ['Tidak dapat mendeteksi kolom Temuan dan Rekomendasi. Pastikan file memiliki header yang sesuai.'],
        warnings: [],
        detectedHeaders: {}
      };
    }

    // Parse data berdasarkan header yang terdeteksi
    const headerRow = rawData[headerRowIndex];
    const headerMap = this.detectMatrixHeaders(headerRow);
    const dataRows = rawData.slice(headerRowIndex + 1);

    const items: MatrixItem[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let lastTemuan = ''; // Track temuan terakhir untuk multiple recommendations
    let lastPenyebab = ''; // Track penyebab terakhir

    dataRows.forEach((row, index) => {
      const rowNumber = headerRowIndex + index + 2; // +2 karena Excel 1-indexed dan skip header

      // Skip baris kosong atau baris yang semua cellnya kosong
      if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
        return;
      }

      let temuan = row[headerMap.temuan]?.toString().trim() || '';
      let penyebab = headerMap.penyebab !== -1 ? (row[headerMap.penyebab]?.toString().trim() || '') : '';
      const rekomendasi = row[headerMap.rekomendasi]?.toString().trim() || '';

      // Skip baris yang benar-benar kosong (tidak ada temuan DAN tidak ada rekomendasi)
      if (!temuan && !rekomendasi) {
        return; // Skip silently
      }

      // Jika temuan kosong tapi rekomendasi ada, gunakan temuan terakhir
      // Ini untuk handle multiple recommendations per temuan
      if (!temuan && rekomendasi && lastTemuan) {
        temuan = lastTemuan;
        penyebab = lastPenyebab; // Gunakan penyebab yang sama juga
        warnings.push(`Baris ${rowNumber}: Menggunakan temuan dari baris sebelumnya (multiple recommendations)`);
      }

      // Validasi data wajib
      if (!temuan) {
        errors.push(`Baris ${rowNumber}: Kolom Temuan tidak boleh kosong`);
        return;
      }

      if (!rekomendasi) {
        errors.push(`Baris ${rowNumber}: Kolom Rekomendasi tidak boleh kosong`);
        return;
      }

      // Warning untuk penyebab kosong
      if (!penyebab && headerMap.penyebab !== -1) {
        warnings.push(`Baris ${rowNumber}: Kolom Penyebab kosong`);
      }

      // Update last temuan dan penyebab untuk row berikutnya
      if (temuan) lastTemuan = temuan;
      if (penyebab) lastPenyebab = penyebab;

      items.push({
        temuan,
        penyebab,
        rekomendasi,
        rowNumber
      });
    });

    return {
      success: errors.length === 0,
      items,
      totalItems: items.length,
      errors,
      warnings,
      detectedHeaders
    };
  }

  /**
   * Parse dengan mapping manual (untuk implementasi future)
   */
  private static parseWithManualMapping(filePath: string): MatrixParseResult {
    // Untuk sekarang, fallback ke auto mapping
    // Implementasi manual mapping bisa ditambahkan nanti
    return this.parseWithAutoMapping(filePath);
  }

  /**
   * Parse file Excel dengan mode simple: baca kolom berurutan tanpa deteksi header
   * Kolom 1 = Temuan, Kolom 2 = Penyebab, Kolom 3 = Rekomendasi
   */
  static async parseMatrixFileSimple(filePath: string): Promise<MatrixParseResult> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('File Excel tidak memiliki sheet');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    if (rawData.length < 1) {
      throw new Error('File Excel kosong');
    }

    const items: MatrixItem[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let lastTemuan = '';
    let lastPenyebab = '';

    // Mulai dari baris 1 (skip baris 0 yang mungkin header)
    // Atau jika baris 0 bukan header, akan tetap diproses
    const startRow = rawData.length > 1 ? 1 : 0;

    rawData.slice(startRow).forEach((row, index) => {
      const rowNumber = startRow + index + 1; // Excel row number (1-indexed)

      // Skip baris kosong
      if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
        return;
      }

      let temuan = row[0]?.toString().trim() || '';
      let penyebab = row[1]?.toString().trim() || '';
      const rekomendasi = row[2]?.toString().trim() || '';

      // Skip jika tidak ada temuan DAN tidak ada rekomendasi
      if (!temuan && !rekomendasi) {
        return;
      }

      // Jika temuan kosong tapi rekomendasi ada, gunakan temuan terakhir
      if (!temuan && rekomendasi && lastTemuan) {
        temuan = lastTemuan;
        penyebab = lastPenyebab;
        warnings.push(`Baris ${rowNumber}: Menggunakan temuan dari baris sebelumnya (multiple recommendations)`);
      }

      // Validasi
      if (!temuan) {
        errors.push(`Baris ${rowNumber}: Kolom pertama (Temuan) tidak boleh kosong`);
        return;
      }

      if (!rekomendasi) {
        errors.push(`Baris ${rowNumber}: Kolom ketiga (Rekomendasi) tidak boleh kosong`);
        return;
      }

      // Update last values
      if (temuan) lastTemuan = temuan;
      if (penyebab) lastPenyebab = penyebab;

      items.push({
        temuan,
        penyebab,
        rekomendasi,
        rowNumber
      });
    });

    return {
      success: errors.length === 0,
      items,
      totalItems: items.length,
      errors,
      warnings,
      detectedHeaders: {
        temuan: 'Kolom 1',
        penyebab: 'Kolom 2',
        rekomendasi: 'Kolom 3'
      }
    };
  }

  /**
   * Deteksi kolom header berdasarkan kata kunci
   */
  private static detectMatrixHeaders(row: any[]): { temuan: number; penyebab: number; rekomendasi: number } {
    const temuanKeywords = ['temuan', 'finding', 'audit finding', 'kondisi', 'permasalahan'];
    const penyebabKeywords = ['penyebab', 'sebab', 'cause', 'root cause', 'akar masalah'];
    const rekomendasiKeywords = ['rekomendasi', 'recommendation', 'saran', 'usulan', 'tindak lanjut'];

    let temuanIndex = -1;
    let penyebabIndex = -1;
    let rekomendasiIndex = -1;

    row.forEach((cell, index) => {
      if (!cell) return;
      
      const cellText = cell.toString().toLowerCase().trim();
      
      // Cek temuan
      if (temuanIndex === -1 && temuanKeywords.some(keyword => cellText.includes(keyword))) {
        temuanIndex = index;
      }
      
      // Cek penyebab
      if (penyebabIndex === -1 && penyebabKeywords.some(keyword => cellText.includes(keyword))) {
        penyebabIndex = index;
      }
      
      // Cek rekomendasi
      if (rekomendasiIndex === -1 && rekomendasiKeywords.some(keyword => cellText.includes(keyword))) {
        rekomendasiIndex = index;
      }
    });

    return {
      temuan: temuanIndex,
      penyebab: penyebabIndex,
      rekomendasi: rekomendasiIndex
    };
  }

  /**
   * Validasi file matrix sebelum parsing
   */
  static validateMatrixFile(filePath: string): { valid: boolean; error?: string } {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File tidak ditemukan' };
    }

    // Check file size (max 10MB)
    const stats = fs.statSync(filePath);
    if (stats.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'Ukuran file maksimal 10MB' };
    }

    // Check file extension
    const ext = filePath.toLowerCase();
    if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      return { valid: false, error: 'Format file harus Excel (.xlsx atau .xls)' };
    }

    // Try to read Excel file
    try {
      const workbook = XLSX.readFile(filePath);
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return { valid: false, error: 'File Excel tidak memiliki sheet' };
      }
    } catch (error) {
      return { valid: false, error: 'File Excel tidak valid atau rusak' };
    }

    return { valid: true };
  }

  /**
   * Get preview dari matrix file
   */
  static async getMatrixPreview(filePath: string, rows = 10): Promise<{
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
    detectedHeaders: any;
  }> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    // Cari header row
    let headerRowIndex = -1;
    let detectedHeaders = {};

    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      const headerMap = this.detectMatrixHeaders(row);
      
      if (headerMap.temuan !== -1 && headerMap.rekomendasi !== -1) {
        headerRowIndex = i;
        detectedHeaders = {
          temuan: row[headerMap.temuan],
          penyebab: headerMap.penyebab !== -1 ? row[headerMap.penyebab] : undefined,
          rekomendasi: row[headerMap.rekomendasi]
        };
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Fallback: gunakan baris pertama sebagai header
      headerRowIndex = 0;
    }

    const headers = rawData[headerRowIndex] || [];
    const dataRows = rawData.slice(headerRowIndex + 1);
    
    const previewRows = dataRows.slice(0, rows).map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header || `Column_${index + 1}`] = row[index] || '';
      });
      return obj;
    });

    return {
      headers: headers.map(h => h || 'Column'),
      rows: previewRows,
      totalRows: dataRows.length,
      detectedHeaders
    };
  }
}