-- Migration: Create Evidence Management System (Simplified)
-- Enhanced evidence system for Matrix Audit with search and filtering capabilities

-- Evidence metadata table (enhanced from existing matrix_items evidence fields)
CREATE TABLE IF NOT EXISTS evidence_files (
    id VARCHAR(36) PRIMARY KEY,
    matrix_item_id VARCHAR(36) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- pdf, jpg, png, doc, etc.
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64), -- SHA-256 hash for duplicate detection
    
    -- Upload info
    uploaded_by VARCHAR(36) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    tags JSON, -- Searchable tags
    
    -- Review status
    status ENUM('pending', 'approved', 'rejected', 'archived') DEFAULT 'pending',
    reviewed_by VARCHAR(36),
    reviewed_at TIMESTAMP NULL,
    review_notes TEXT,
    
    -- Metadata for search
    searchable_content TEXT, -- Extracted text content for search
    category VARCHAR(100), -- Evidence category
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_evidence_matrix_item (matrix_item_id),
    INDEX idx_evidence_uploaded_by (uploaded_by),
    INDEX idx_evidence_status (status),
    INDEX idx_evidence_file_type (file_type),
    INDEX idx_evidence_uploaded_at (uploaded_at),
    INDEX idx_evidence_category (category),
    INDEX idx_evidence_priority (priority),
    INDEX idx_evidence_hash (file_hash)
);

-- User activity logs for performance monitoring
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL, -- login, upload, search, review, etc.
    resource_type VARCHAR(50), -- evidence, matrix, report, etc.
    resource_id VARCHAR(36),
    details JSON, -- Additional action details
    
    -- Request info
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_duration_ms INT, -- Performance tracking
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_action (action),
    INDEX idx_activity_resource (resource_type, resource_id),
    INDEX idx_activity_created (created_at)
);

-- System performance metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id VARCHAR(36) PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- cpu_usage, memory_usage, disk_usage, response_time, etc.
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(20), -- %, ms, MB, etc.
    metric_details JSON, -- Additional metric data
    
    -- Context
    component VARCHAR(50), -- backend, database, frontend, etc.
    environment VARCHAR(20) DEFAULT 'production',
    
    -- Timestamps
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by VARCHAR(36), -- System or user who recorded
    
    -- Indexes
    INDEX idx_metrics_type (metric_type),
    INDEX idx_metrics_component (component),
    INDEX idx_metrics_recorded (recorded_at),
    INDEX idx_metrics_type_time (metric_type, recorded_at)
);

-- Evidence categories lookup table
CREATE TABLE IF NOT EXISTS evidence_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50), -- Icon class or emoji
    color VARCHAR(7), -- Hex color code
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Evidence tags table for better organization
CREATE TABLE IF NOT EXISTS evidence_tags (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_tags_name (name),
    INDEX idx_tags_usage (usage_count)
);

-- Evidence file tags relationship
CREATE TABLE IF NOT EXISTS evidence_file_tags (
    evidence_id VARCHAR(36) NOT NULL,
    tag_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (evidence_id, tag_id),
    FOREIGN KEY (evidence_id) REFERENCES evidence_files(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES evidence_tags(id) ON DELETE CASCADE
);

-- Insert default evidence categories
INSERT IGNORE INTO evidence_categories (id, name, description, icon, color, sort_order) VALUES
(UUID(), 'Dokumen Pendukung', 'Dokumen resmi dan surat-surat pendukung', '📄', '#3B82F6', 1),
(UUID(), 'Foto/Gambar', 'Foto dokumentasi dan gambar bukti', '📸', '#10B981', 2),
(UUID(), 'Laporan', 'Laporan dan analisis terkait', '📊', '#F59E0B', 3),
(UUID(), 'Sertifikat', 'Sertifikat dan dokumen legal', '🏆', '#8B5CF6', 4),
(UUID(), 'Data Teknis', 'Data teknis dan spesifikasi', '⚙️', '#EF4444', 5),
(UUID(), 'Lainnya', 'File evidence lainnya', '📎', '#6B7280', 6);

-- Insert some default tags
INSERT IGNORE INTO evidence_tags (id, name, description, color) VALUES
(UUID(), 'urgent', 'Bukti yang memerlukan perhatian segera', '#EF4444'),
(UUID(), 'verified', 'Bukti yang sudah diverifikasi', '#10B981'),
(UUID(), 'incomplete', 'Bukti yang belum lengkap', '#F59E0B'),
(UUID(), 'confidential', 'Bukti yang bersifat rahasia', '#8B5CF6'),
(UUID(), 'public', 'Bukti yang dapat diakses publik', '#3B82F6'),
(UUID(), 'archived', 'Bukti yang sudah diarsipkan', '#6B7280');

-- Add some initial system metrics
INSERT IGNORE INTO system_metrics (id, metric_type, metric_value, metric_unit, component) VALUES
(UUID(), 'uptime', 100, '%', 'backend'),
(UUID(), 'response_time', 150, 'ms', 'backend'),
(UUID(), 'memory_usage', 45.5, '%', 'backend'),
(UUID(), 'disk_usage', 23.2, '%', 'backend'),
(UUID(), 'active_connections', 12, 'count', 'database');

-- Success message
SELECT 'Evidence management system created successfully!' as message;