import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import * as csv from 'csv-parse/sync';
import { ParsedData, PreviewData, FileType } from '../types';

export class FileParserService {
  /**
   * Parse file dan return all data
   * Feature: file-import, Property 3: Preview data accuracy
   */
  static async parseFile(filePath: string, fileType: FileType): Promise<ParsedData> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File tidak ditemukan: ${filePath}`);
    }

    try {
      if (fileType === 'xlsx' || fileType === 'xls') {
        return this.parseExcel(filePath);
      } else if (fileType === 'csv') {
        return this.parseCSV(filePath);
      } else {
        throw new Error(`Format file tidak didukung: ${fileType}`);
      }
    } catch (error) {
      throw new Error(`Gagal parsing file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get preview dari file (first N rows)
   * Feature: file-import, Property 3: Preview data accuracy
   */
  static async getPreview(filePath: string, fileType: FileType, rows = 10): Promise<PreviewData> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File tidak ditemukan: ${filePath}`);
    }

    try {
      if (fileType === 'xlsx' || fileType === 'xls') {
        return this.getExcelPreview(filePath, rows);
      } else if (fileType === 'csv') {
        return this.getCSVPreview(filePath, rows);
      } else {
        throw new Error(`Format file tidak didukung: ${fileType}`);
      }
    } catch (error) {
      throw new Error(`Gagal membaca preview: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse Excel file (.xlsx, .xls) dengan header di row 5
   */
  private static parseExcel(filePath: string): ParsedData {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('File Excel tidak memiliki sheet');
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Read all data as array of arrays first
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    if (rawData.length < 5) {
      throw new Error('File Excel harus memiliki minimal 5 baris (header di baris 5)');
    }

    // Get headers from row 5 (index 4)
    const headers = rawData[4] as string[];
    
    if (!headers || headers.length === 0) {
      throw new Error('Header tidak ditemukan di baris 5');
    }

    // Clean headers - remove empty columns and normalize names
    const cleanHeaders = headers.map((header, index) => {
      if (!header || header.toString().trim() === '') {
        return `Column_${index + 1}`;
      }
      return header.toString().trim();
    });

    // Convert data rows (starting from row 6) to objects using cleaned headers
    const dataRows = rawData.slice(5); // Skip first 5 rows (0-4), data starts from row 6
    const rows = dataRows.map(row => {
      const obj: Record<string, any> = {};
      cleanHeaders.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    // Filter out completely empty rows
    const filteredRows = rows.filter(row => {
      return Object.values(row).some(value => value && value.toString().trim() !== '');
    });

    return {
      headers: cleanHeaders,
      rows: filteredRows,
      totalRows: filteredRows.length
    };
  }

  /**
   * Get preview dari Excel file dengan header di row 5
   */
  private static getExcelPreview(filePath: string, rows: number): PreviewData {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('File Excel tidak memiliki sheet');
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Read all data as array of arrays first
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    if (rawData.length < 5) {
      throw new Error('File Excel harus memiliki minimal 5 baris (header di baris 5)');
    }

    // Get headers from row 5 (index 4)
    const headers = rawData[4] as string[];
    
    if (!headers || headers.length === 0) {
      throw new Error('Header tidak ditemukan di baris 5');
    }

    // Clean headers - remove empty columns and normalize names
    const cleanHeaders = headers.map((header, index) => {
      if (!header || header.toString().trim() === '') {
        return `Column_${index + 1}`;
      }
      return header.toString().trim();
    });

    // Convert data rows (starting from row 6) to objects using cleaned headers
    const dataRows = rawData.slice(5); // Skip first 5 rows (0-4), data starts from row 6
    const allRows = dataRows.map(row => {
      const obj: Record<string, any> = {};
      cleanHeaders.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    // Filter out completely empty rows
    const filteredRows = allRows.filter(row => {
      return Object.values(row).some(value => value && value.toString().trim() !== '');
    });

    const previewRows = filteredRows.slice(0, rows);

    return {
      headers: cleanHeaders,
      rows: previewRows,
      totalRows: filteredRows.length
    };
  }

  /**
   * Parse CSV file
   */
  private static parseCSV(filePath: string): ParsedData {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length === 0) {
      throw new Error('File CSV kosong atau tidak memiliki data');
    }

    const headers = Object.keys(records[0] as Record<string, any>);

    return {
      headers,
      rows: records as Record<string, any>[],
      totalRows: records.length
    };
  }

  /**
   * Get preview dari CSV file
   */
  private static getCSVPreview(filePath: string, rows: number): PreviewData {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length === 0) {
      throw new Error('File CSV kosong atau tidak memiliki data');
    }

    const previewRows = records.slice(0, rows);
    const headers = Object.keys(records[0] as Record<string, any>);

    return {
      headers,
      rows: previewRows as Record<string, any>[],
      totalRows: records.length
    };
  }

  /**
   * Validate file format dan size
   * Feature: file-import, Property 1: File format validation
   * Feature: file-import, Property 2: File size limit enforcement
   */
  static validateFile(filePath: string, maxSizeBytes = 10 * 1024 * 1024): { valid: boolean; error?: string } {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File tidak ditemukan' };
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > maxSizeBytes) {
      return { valid: false, error: `Ukuran file maksimal ${maxSizeBytes / 1024 / 1024}MB` };
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];

    if (!allowedExtensions.includes(ext)) {
      return { valid: false, error: 'Format file harus Excel (.xlsx, .xls) atau CSV (.csv)' };
    }

    return { valid: true };
  }

  /**
   * Get file type dari extension
   */
  static getFileType(filePath: string): FileType {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.xlsx') return 'xlsx';
    if (ext === '.xls') return 'xls';
    if (ext === '.csv') return 'csv';

    throw new Error(`Format file tidak didukung: ${ext}`);
  }
}
