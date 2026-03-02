export type UserRole = 'super_admin' | 'inspektorat' | 'opd';

export interface UserPermission {
  id: string;
  user_id: string;
  permission: string;
  granted_by?: string;
  created_at: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_info?: string;
  ip_address?: string;
  location?: string;
  created_at: Date;
  last_activity: Date;
  expires_at: Date;
  is_active: boolean;
}

export type ReportStatus = 'draft' | 'pending' | 'in_progress' | 'approved' | 'rejected' | 'needs_revision';

export type FollowUpStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  name: string;
  institution?: string;
  role: UserRole;
  status?: 'active' | 'inactive';
  password_changed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  created_by: string;
  assigned_to: string;
  status: ReportStatus;
  rejection_notes?: string;
  recommendation?: string;
  created_at: Date;
  updated_at: Date;
  creator_name?: string;
  creator_institution?: string;
}

export interface FollowUp {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  status: FollowUpStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface EvidenceFile {
  id: string;
  follow_up_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: Date;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: Omit<User, 'password_hash'>;
  error?: string;
}

export interface CreateReportDTO {
  title: string;
  description: string;
  assignedUserId: string;
  createdBy: string;
}

export interface CreateFollowUpDTO {
  reportId: string;
  userId: string;
  content: string;
}

export interface UpdateFollowUpDTO {
  content?: string;
}

export type FileImportStatus = 'processing' | 'completed' | 'failed';
export type FileType = 'xlsx' | 'xls' | 'csv';

export interface FileImport {
  id: string;
  admin_id: string;
  file_name: string;
  file_path: string;
  file_type: FileType;
  column_mapping: Record<string, string>;
  total_rows: number;
  success_count: number;
  failure_count: number;
  duplicate_count: number;
  status: FileImportStatus;
  error_message?: string;
  created_at: Date;
  completed_at?: Date;
}

export interface ImportedReport {
  id: string;
  import_id: string;
  report_id: string;
  row_number: number;
  original_data: Record<string, any>;
  created_at: Date;
}

export interface ImportError {
  id: string;
  import_id: string;
  row_number: number;
  error_message: string;
  row_data: Record<string, any>;
  created_at: Date;
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export interface PreviewData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export interface ColumnMapping {
  [systemField: string]: string;
}

export interface MappedData {
  rows: ImportRow[];
  errors: MappingError[];
}

export interface ImportRow {
  nomorLHP: string;
  tanggalLHP: Date | string;
  temuan: string;
  penyebab: string;
  rekomendasi: string;
  tindakLanjut?: string; // New field for follow-up actions
  institusiTujuan?: string; // Made optional
}

export interface MappingError {
  rowNumber: number;
  errors: string[];
}

export interface ValidationReport {
  totalRows: number;
  validRows: number;
  invalidRows: ValidationError[];
  duplicateRows: DuplicateError[];
}

export interface ValidationError {
  rowNumber: number;
  errors: string[];
}

export interface DuplicateError {
  rowNumber: number;
  nomorLHP: string;
  existingReportId: string;
}

export interface ImportResult {
  importId: string;
  createdReports: string[];
  failedRows: FailedRow[];
  summary: ImportSummary;
}

export interface FailedRow {
  rowNumber: number;
  reason: string;
}

export interface ImportSummary {
  totalRows: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  timestamp: Date;
  adminId: string;
}

export interface ImportRecord {
  id: string;
  adminId: string;
  adminName: string;
  timestamp: Date;
  totalRows: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
}

export interface ImportDetails {
  record: ImportRecord;
  mapping: ColumnMapping;
  originalData: ParsedData;
  createdReports: Report[];
  failedRows: FailedRow[];
}
