-- Migration: Create Matrix Audit System
-- System for Inspektorat to upload Excel audit findings and OPD to respond with follow-up actions

-- Matrix Reports table (Laporan Matrix dari Inspektorat)
CREATE TABLE IF NOT EXISTS matrix_reports (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    uploaded_by VARCHAR(36) NOT NULL, -- Inspektorat user ID
    target_opd VARCHAR(255) NOT NULL, -- Target OPD institution
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    status ENUM('draft', 'active', 'completed') DEFAULT 'draft',
    total_items INT DEFAULT 0,
    completed_items INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_matrix_reports_target_opd (target_opd),
    INDEX idx_matrix_reports_status (status),
    INDEX idx_matrix_reports_uploaded_by (uploaded_by)
);

-- Matrix Items table (Item temuan dalam laporan)
CREATE TABLE IF NOT EXISTS matrix_items (
    id VARCHAR(36) PRIMARY KEY,
    matrix_report_id VARCHAR(36) NOT NULL,
    item_number INT NOT NULL,
    temuan TEXT NOT NULL, -- Temuan audit
    penyebab TEXT NOT NULL, -- Penyebab temuan
    rekomendasi TEXT NOT NULL, -- Rekomendasi perbaikan
    tindak_lanjut TEXT, -- Response dari OPD (diisi kemudian)
    evidence_filename VARCHAR(255), -- Nama file PDF evidence
    evidence_file_path VARCHAR(500), -- Path file PDF evidence
    evidence_file_size INT, -- Ukuran file dalam bytes
    status ENUM('pending', 'submitted', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by VARCHAR(36), -- Inspektorat reviewer
    review_notes TEXT, -- Catatan review dari Inspektorat
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (matrix_report_id) REFERENCES matrix_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_matrix_items_report_id (matrix_report_id),
    INDEX idx_matrix_items_status (status),
    UNIQUE KEY unique_item_per_report (matrix_report_id, item_number)
);

-- Matrix Assignments table (Penugasan matrix ke OPD users)
CREATE TABLE IF NOT EXISTS matrix_assignments (
    id VARCHAR(36) PRIMARY KEY,
    matrix_report_id VARCHAR(36) NOT NULL,
    assigned_to VARCHAR(36) NOT NULL, -- OPD user ID
    assigned_by VARCHAR(36) NOT NULL, -- Inspektorat user ID
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL, -- Kapan OPD mulai mengerjakan
    completed_at TIMESTAMP NULL, -- Kapan semua item selesai
    notes TEXT, -- Catatan penugasan
    FOREIGN KEY (matrix_report_id) REFERENCES matrix_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_matrix_assignments_assigned_to (assigned_to),
    INDEX idx_matrix_assignments_status (status),
    UNIQUE KEY unique_assignment_per_report (matrix_report_id, assigned_to)
);

-- Matrix Item History table (History revisi item)
CREATE TABLE IF NOT EXISTS matrix_item_history (
    id VARCHAR(36) PRIMARY KEY,
    matrix_item_id VARCHAR(36) NOT NULL,
    tindak_lanjut_old TEXT, -- Tindak lanjut sebelumnya
    evidence_filename_old VARCHAR(255), -- File evidence sebelumnya
    evidence_file_path_old VARCHAR(500),
    revision_reason TEXT, -- Alasan revisi dari Inspektorat
    revised_by VARCHAR(36) NOT NULL, -- User yang melakukan revisi
    revised_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (matrix_item_id) REFERENCES matrix_items(id) ON DELETE CASCADE,
    FOREIGN KEY (revised_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_matrix_history_item_id (matrix_item_id)
);

-- Matrix Upload Sessions table (Session upload Excel)
CREATE TABLE IF NOT EXISTS matrix_upload_sessions (
    id VARCHAR(36) PRIMARY KEY,
    uploaded_by VARCHAR(36) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    temp_file_path VARCHAR(500) NOT NULL,
    parsed_data JSON, -- Data hasil parsing Excel
    target_opd VARCHAR(255),
    status ENUM('parsing', 'preview', 'confirmed', 'failed') DEFAULT 'parsing',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 HOUR),
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_upload_sessions_uploaded_by (uploaded_by),
    INDEX idx_upload_sessions_status (status)
);

-- Add indexes for better performance
CREATE INDEX idx_matrix_reports_created_at ON matrix_reports(created_at DESC);
CREATE INDEX idx_matrix_items_updated_at ON matrix_items(updated_at DESC);
CREATE INDEX idx_matrix_assignments_assigned_at ON matrix_assignments(assigned_at DESC);