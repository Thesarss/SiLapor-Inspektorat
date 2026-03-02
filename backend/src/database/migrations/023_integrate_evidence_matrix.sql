-- Migration 023: Integrate Evidence with Matrix System
-- This migration updates the evidence system to work with matrix assignments

-- Update evidence_files table to link with matrix_items
ALTER TABLE evidence_files 
ADD COLUMN matrix_item_id VARCHAR(36) NULL AFTER uploaded_by,
ADD COLUMN assignment_id VARCHAR(36) NULL AFTER matrix_item_id;

-- Add foreign key constraints (will be added after matrix tables are populated)
-- These will be added in a separate step to avoid constraint errors

-- Update evidence_files table structure for matrix workflow
ALTER TABLE evidence_files 
MODIFY COLUMN category VARCHAR(100) DEFAULT 'Tindak Lanjut',
MODIFY COLUMN priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
MODIFY COLUMN status ENUM('pending', 'submitted', 'approved', 'rejected', 'needs_revision') DEFAULT 'pending';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evidence_matrix_item ON evidence_files(matrix_item_id);
CREATE INDEX IF NOT EXISTS idx_evidence_assignment ON evidence_files(assignment_id);
CREATE INDEX IF NOT EXISTS idx_evidence_status_matrix ON evidence_files(status, matrix_item_id);

-- Update matrix_items table to track evidence submission
ALTER TABLE matrix_items 
ADD COLUMN evidence_submitted BOOLEAN DEFAULT FALSE AFTER evidence_file_size,
ADD COLUMN evidence_count INT DEFAULT 0 AFTER evidence_submitted,
ADD COLUMN last_evidence_at TIMESTAMP NULL AFTER evidence_count;

-- Add progress tracking to matrix_assignments
ALTER TABLE matrix_assignments 
ADD COLUMN progress_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER completed_at,
ADD COLUMN items_with_evidence INT DEFAULT 0 AFTER progress_percentage,
ADD COLUMN total_items INT DEFAULT 0 AFTER items_with_evidence,
ADD COLUMN last_activity_at TIMESTAMP NULL AFTER total_items;

-- Create a view for inspektorat to monitor OPD progress
CREATE OR REPLACE VIEW matrix_progress_view AS
SELECT 
    ma.id as assignment_id,
    ma.assigned_to,
    ma.assigned_by,
    ma.status as assignment_status,
    ma.assigned_at,
    ma.completed_at,
    ma.progress_percentage,
    ma.items_with_evidence,
    ma.total_items,
    ma.last_activity_at,
    mr.id as matrix_report_id,
    mr.title as matrix_title,
    mr.description as matrix_description,
    mr.target_opd,
    mr.created_at as matrix_created_at,
    u.name as opd_user_name,
    u.email as opd_user_email,
    u.institution as opd_institution,
    inspector.name as inspector_name,
    -- Calculate completion stats
    COALESCE(
        (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = mr.id AND mi.status IN ('submitted', 'approved')), 
        0
    ) as completed_items,
    COALESCE(
        (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = mr.id), 
        0
    ) as total_matrix_items,
    COALESCE(
        (SELECT COUNT(*) FROM evidence_files ef 
         JOIN matrix_items mi ON ef.matrix_item_id = mi.id 
         WHERE mi.matrix_report_id = mr.id AND ef.status IN ('submitted', 'approved')), 
        0
    ) as evidence_files_count
FROM matrix_assignments ma
JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
JOIN users u ON ma.assigned_to = u.id
JOIN users inspector ON ma.assigned_by = inspector.id
ORDER BY ma.assigned_at DESC;

-- Create a view for evidence tracking per matrix item
CREATE OR REPLACE VIEW matrix_evidence_tracking AS
SELECT 
    mi.id as matrix_item_id,
    mi.matrix_report_id,
    mi.item_number,
    mi.temuan,
    mi.penyebab,
    mi.rekomendasi,
    mi.tindak_lanjut,
    mi.status as item_status,
    mi.submitted_at,
    mi.reviewed_at,
    mr.title as matrix_title,
    mr.target_opd,
    ma.assigned_to as opd_user_id,
    u.name as opd_user_name,
    u.institution as opd_institution,
    -- Evidence information
    COALESCE(
        (SELECT COUNT(*) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        0
    ) as evidence_count,
    COALESCE(
        (SELECT GROUP_CONCAT(ef.original_filename SEPARATOR ', ') 
         FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        NULL
    ) as evidence_files,
    COALESCE(
        (SELECT MAX(ef.uploaded_at) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        NULL
    ) as last_evidence_upload,
    COALESCE(
        (SELECT ef.status FROM evidence_files ef WHERE ef.matrix_item_id = mi.id ORDER BY ef.uploaded_at DESC LIMIT 1), 
        NULL
    ) as latest_evidence_status
FROM matrix_items mi
JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
JOIN users u ON ma.assigned_to = u.id
ORDER BY mr.created_at DESC, mi.item_number ASC;

-- Insert sample data for testing (will be removed in production)
-- This helps demonstrate the workflow

COMMIT;