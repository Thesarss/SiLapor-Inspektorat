-- Performance optimization indexes
-- Add indexes for frequently queried columns

-- Reports table indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_to ON reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Followup items indexes
CREATE INDEX IF NOT EXISTS idx_followup_items_report_id ON followup_items(report_id);
CREATE INDEX IF NOT EXISTS idx_followup_items_status ON followup_items(status);

-- Followup recommendations indexes
CREATE INDEX IF NOT EXISTS idx_followup_item_recommendations_followup_item_id ON followup_item_recommendations(followup_item_id);
CREATE INDEX IF NOT EXISTS idx_followup_item_recommendations_status ON followup_item_recommendations(status);

-- Metrics table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_metrics_report_id ON metrics(report_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at);

-- Revision items indexes
CREATE INDEX IF NOT EXISTS idx_revision_items_report_id ON revision_items(report_id);
CREATE INDEX IF NOT EXISTS idx_revision_items_status ON revision_items(status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reports_status_assigned ON reports(status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

-- Matrix audit indexes (if tables exist)
CREATE INDEX IF NOT EXISTS idx_matrix_assignments_assigned_to ON matrix_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_matrix_assignments_status ON matrix_assignments(status);
CREATE INDEX IF NOT EXISTS idx_matrix_templates_created_by ON matrix_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_matrix_templates_status ON matrix_templates(status);