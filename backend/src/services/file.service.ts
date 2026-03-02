import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { FileModel } from '../models/file.model';
import { EvidenceFile } from '../types';
import { createError } from '../middleware/error.middleware';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only accept PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Hanya file PDF yang diperbolehkan'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export const FileService = {
  async uploadFile(file: Express.Multer.File, followUpId: string): Promise<EvidenceFile> {
    if (!file) {
      throw createError('No file provided', 400);
    }

    const evidenceFile = await FileModel.create(
      followUpId,
      file.originalname,
      file.filename,
      file.path,
      file.size
    );

    return evidenceFile;
  },

  async deleteFile(fileId: string): Promise<void> {
    const file = await FileModel.findById(fileId);

    if (!file) {
      throw createError('File not found', 404);
    }

    // Delete from filesystem
    if (fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }

    // Delete from database
    await FileModel.delete(fileId);
  },

  async getFilesByFollowUp(followUpId: string): Promise<EvidenceFile[]> {
    return FileModel.findByFollowUpId(followUpId);
  },

  async getFileById(fileId: string): Promise<EvidenceFile | null> {
    return FileModel.findById(fileId);
  },

  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.mimetype !== 'application/pdf') {
      return { valid: false, error: 'Hanya file PDF yang diperbolehkan' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'Ukuran file maksimal 100MB' };
    }

    return { valid: true };
  },

  async uploadFileToReport(file: Express.Multer.File, reportId: string): Promise<EvidenceFile> {
    if (!file) {
      throw createError('No file provided', 400);
    }

    const evidenceFile = await FileModel.createForReport(
      reportId,
      file.originalname,
      file.filename,
      file.path,
      file.size
    );

    return evidenceFile;
  },

  async getFilesByReport(reportId: string): Promise<EvidenceFile[]> {
    return FileModel.findByReportId(reportId);
  },
};
