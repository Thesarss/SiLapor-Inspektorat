import * as XLSX from 'xlsx';
import { ParsedData, ColumnMapping } from '../types';

export class FixedFormatParserService {
  /**
   * Parse Excel dengan format tetap yang sudah diketahui
   * Langsung menentukan kolom tanpa perlu mapping manual
   */
  static parseFixedFormatExcel(filePath: string): { data: ParsedData; mapping: ColumnMapping } {
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

    // Clean headers
    const cleanHeaders = headers.map((header, index) => {
      if (!header || header.toString().trim() === '') {
        return `Column_${index + 1}`;
      }
      return header.toString().trim();
    });

    // Convert data rows (starting from row 6) to objects
    const dataRows = rawData.slice(5);
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

    const parsedData: ParsedData = {
      headers: cleanHeaders,
      rows: filteredRows,
      totalRows: filteredRows.length
    };

    // Create fixed mapping based on known format
    const fixedMapping = this.createFixedMapping(cleanHeaders);

    return {
      data: parsedData,
      mapping: fixedMapping
    };
  }

  /**
   * Create mapping berdasarkan format tetap yang sudah diketahui
   * Menggunakan posisi kolom dan pattern yang konsisten
   */
  private static createFixedMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};

    // Definisi pattern untuk format tetap
    const fixedPatterns: Record<string, { 
      patterns: string[], 
      positions?: number[], // Posisi kolom yang mungkin (0-based)
      priority: number 
    }> = {
      nomorLHP: {
        patterns: [
          'nomor lhp', 'no lhp', 'nomor_lhp', 'no_lhp', 'lhp',
          'nomor laporan', 'no laporan', 'nomor audit', 'no audit',
          'no', 'nomor'
        ],
        positions: [0, 1, 2], // Biasanya di kolom awal
        priority: 1
      },
      tanggalLHP: {
        patterns: [
          'tanggal lhp', 'tgl lhp', 'tanggal_lhp', 'tgl_lhp',
          'tanggal laporan', 'tgl laporan', 'tanggal audit', 'tgl audit',
          'date', 'tanggal', 'tgl'
        ],
        positions: [1, 2, 3], // Biasanya setelah nomor
        priority: 2
      },
      institusiTujuan: {
        patterns: [
          'institusi tujuan', 'institusi', 'opd', 'dinas', 'badan',
          'unit kerja', 'instansi', 'organisasi', 'lembaga',
          'nama opd', 'nama dinas', 'nama instansi'
        ],
        positions: [2, 3, 4], // Biasanya di awal-tengah
        priority: 3
      },
      temuan: {
        patterns: [
          'temuan', 'finding', 'permasalahan', 'masalah', 'kondisi',
          'hasil temuan', 'audit finding', 'temuan audit', 'uraian temuan'
        ],
        positions: [4, 5, 6, 7], // Biasanya di tengah
        priority: 4
      },
      penyebab: {
        patterns: [
          'penyebab', 'cause', 'akar masalah', 'root cause', 'sebab',
          'faktor penyebab', 'penyebab masalah', 'kriteria'
        ],
        positions: [5, 6, 7, 8], // Setelah temuan
        priority: 5
      },
      rekomendasi: {
        patterns: [
          'rekomendasi', 'recommendation', 'saran', 'usulan',
          'rekomendasi perbaikan', 'saran perbaikan', 'tindakan perbaikan'
        ],
        positions: [6, 7, 8, 9], // Biasanya setelah penyebab
        priority: 6
      },
      tindakLanjut: {
        patterns: [
          'tindak lanjut', 'tindaklanjut', 'followup', 'follow up',
          'tindakan', 'action', 'langkah tindak lanjut', 'rencana tindak lanjut',
          'rencana tindakan', 'tindakan korektif'
        ],
        positions: [7, 8, 9, 10], // Biasanya di akhir
        priority: 7
      }
    };

    // Track kolom yang sudah digunakan untuk menghindari duplikasi
    const usedHeaders = new Set<string>();

    // Sort fields by priority untuk mapping yang lebih akurat
    const sortedFields = Object.entries(fixedPatterns).sort((a, b) => a[1].priority - b[1].priority);

    for (const [systemField, config] of sortedFields) {
      let bestMatch = '';
      let bestScore = 0;

      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (!header || header.trim() === '' || usedHeaders.has(header)) continue;
        
        const headerLower = header.toLowerCase().trim();
        let score = 0;

        // Check pattern matching
        for (const pattern of config.patterns) {
          const patternLower = pattern.toLowerCase();
          
          // Exact match (skor tertinggi)
          if (headerLower === patternLower) {
            score = Math.max(score, 100);
          }
          // Contains pattern
          else if (headerLower.includes(patternLower)) {
            score = Math.max(score, 80);
          }
          // Pattern contains header
          else if (patternLower.includes(headerLower)) {
            score = Math.max(score, 60);
          }
          // Word matching
          else {
            const headerWords = headerLower.split(/\s+/);
            const patternWords = patternLower.split(/\s+/);
            
            let matchingWords = 0;
            for (const headerWord of headerWords) {
              for (const patternWord of patternWords) {
                if (headerWord === patternWord || 
                    headerWord.includes(patternWord) || 
                    patternWord.includes(headerWord)) {
                  matchingWords++;
                  break;
                }
              }
            }
            
            if (matchingWords > 0) {
              score = Math.max(score, (matchingWords / Math.max(headerWords.length, patternWords.length)) * 40);
            }
          }
        }

        // Bonus score untuk posisi yang diharapkan
        if (config.positions && config.positions.includes(i)) {
          score += 20;
        }

        // Penalty untuk posisi yang terlalu jauh dari yang diharapkan
        if (config.positions && config.positions.length > 0) {
          const minExpectedPos = Math.min(...config.positions);
          const maxExpectedPos = Math.max(...config.positions);
          if (i < minExpectedPos - 2 || i > maxExpectedPos + 2) {
            score -= 10;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = header;
        }
      }

      // Gunakan match jika skor cukup tinggi
      if (bestScore >= 30 && bestMatch) {
        mapping[systemField] = bestMatch;
        usedHeaders.add(bestMatch);
        console.log(`Fixed format mapped ${systemField} -> ${bestMatch} (score: ${bestScore})`);
      }
    }

    // Validasi mapping untuk field wajib
    const requiredFields = ['temuan', 'rekomendasi'];
    const missingFields = requiredFields.filter(field => !mapping[field]);
    
    if (missingFields.length > 0) {
      console.warn(`Warning: Required fields tidak ter-mapping: ${missingFields.join(', ')}`);
      
      // Fallback: coba mapping berdasarkan posisi saja untuk field wajib
      if (!mapping.temuan && headers.length > 4) {
        // Cari kolom yang mungkin berisi temuan (biasanya kolom dengan teks panjang)
        for (let i = 3; i < Math.min(headers.length, 8); i++) {
          const header = headers[i];
          if (header && !usedHeaders.has(header)) {
            mapping.temuan = header;
            usedHeaders.add(header);
            console.log(`Fallback mapping temuan -> ${header} (position ${i})`);
            break;
          }
        }
      }
      
      if (!mapping.rekomendasi && headers.length > 5) {
        // Cari kolom yang mungkin berisi rekomendasi (biasanya setelah temuan)
        for (let i = 4; i < Math.min(headers.length, 10); i++) {
          const header = headers[i];
          if (header && !usedHeaders.has(header)) {
            mapping.rekomendasi = header;
            usedHeaders.add(header);
            console.log(`Fallback mapping rekomendasi -> ${header} (position ${i})`);
            break;
          }
        }
      }
    }

    return mapping;
  }

  /**
   * Validate apakah file menggunakan format tetap yang dikenal
   */
  static validateFixedFormat(headers: string[]): { isFixedFormat: boolean; confidence: number; detectedFields: string[] } {
    const mapping = this.createFixedMapping(headers);
    const detectedFields = Object.keys(mapping);
    
    // Hitung confidence berdasarkan jumlah field yang berhasil di-mapping
    const requiredFields = ['temuan', 'rekomendasi'];
    const optionalFields = ['nomorLHP', 'tanggalLHP', 'institusiTujuan', 'penyebab', 'tindakLanjut'];
    
    let confidence = 0;
    
    // Required fields (bobot tinggi)
    for (const field of requiredFields) {
      if (mapping[field]) {
        confidence += 40; // 40 points per required field
      }
    }
    
    // Optional fields (bobot rendah)
    for (const field of optionalFields) {
      if (mapping[field]) {
        confidence += 4; // 4 points per optional field
      }
    }
    
    const isFixedFormat = confidence >= 60; // Minimal 60% confidence
    
    return {
      isFixedFormat,
      confidence,
      detectedFields
    };
  }
}