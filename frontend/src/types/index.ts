export type UserRole = 'super_admin' | 'inspektorat' | 'opd';
export type ReportStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'needs_revision';
export type RevisionStatus = 'pending' | 'completed' | 'approved';
export type MetricSeverity = 'low' | 'medium' | 'high' | 'critical';
export type MetricStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type FollowUpStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

// Matrix types
export type MatrixTemplateType = 'evaluation' | 'audit' | 'monitoring' | 'assessment';
export type MatrixTemplateStatus = 'draft' | 'published' | 'archived';
export type MatrixFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';
export type MatrixAssignmentStatus = 'pending' | 'in_progress' | 'submitted' | 'reviewed' | 'approved' | 'rejected';

export interface MatrixTemplate {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  target_institution?: string;
  template_type: MatrixTemplateType;
  status: MatrixTemplateStatus;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface MatrixField {
  id: string;
  template_id: string;
  field_name: string;
  field_type: MatrixFieldType;
  field_options?: any;
  is_required: boolean;
  field_order: number;
  validation_rules?: any;
  help_text?: string;
  created_at: string;
}

export interface MatrixAssignment {
  id: string;
  template_id: string;
  assigned_to: string;
  assigned_by: string;
  status: MatrixAssignmentStatus;
  assigned_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  due_date?: string;
  notes?: string;
  template?: MatrixTemplate;
  assigned_user?: User;
  assigner_user?: User;
}

export interface RevisionItem {
  id: string;
  report_id: string;
  item_number: number;
  description: string;
  status: RevisionStatus;
  user_response: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevisionFile {
  id: string;
  revision_item_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  institution?: string;
  role: UserRole;
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
  created_at: string;
  updated_at: string;
  creator_name?: string;
  creator_institution?: string;
  assignee_name?: string;
}

export interface FollowUp {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  status: FollowUpStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceFile {
  id: string;
  follow_up_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  in_progress: number;
  approved: number;
  rejected: number;
}

export interface FindingsCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: string;
  report_id: string;
  category_id: string;
  title: string;
  description?: string;
  finding_number?: string;
  severity: MetricSeverity;
  status: MetricStatus;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  color?: string;
  icon?: string;
}
