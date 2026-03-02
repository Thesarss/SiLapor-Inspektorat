-- Migration: Create Evidence Management System
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
    
    -- Foreign keys
    FOREIGN KEY (matrix_item_id) REFERENCES matrix_items(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    
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

-- Evidence search index table for full-text search
CREATE TABLE IF NOT EXISTS evidence_search_index (
    id VARCHAR(36) PRIMARY KEY,
    evidence_id VARCHAR(36) NOT NULL,
    search_content TEXT NOT NULL,
    keywords TEXT, -- Comma-separated keywords
    
    FOREIGN KEY (evidence_id) REFERENCES evidence_files(id) ON DELETE CASCADE,
    FULLTEXT INDEX idx_search_content (search_content),
    FULLTEXT INDEX idx_keywords (keywords)
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
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id),
    
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

-- Insert default evidence categories
INSERT IGNORE INTO evidence_categories (id, name, description, icon, color, sort_order) VALUES
(UUID(), 'Dokumen Pendukung', 'Dokumen resmi dan surat-surat pendukung', '📄', '#3B82F6', 1),
(UUID(), 'Foto/Gambar', 'Foto dokumentasi dan gambar bukti', '📸', '#10B981', 2),
(UUID(), 'Laporan', 'Laporan dan analisis terkait', '📊', '#F59E0B', 3),
(UUID(), 'Sertifikat', 'Sertifikat dan dokumen legal', '🏆', '#8B5CF6', 4),
(UUID(), 'Data Teknis', 'Data teknis dan spesifikasi', '⚙️', '#EF4444', 5),
(UUID(), 'Lainnya', 'File evidence lainnya', '📎', '#6B7280', 6);

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

-- Insert some default tags
INSERT IGNORE INTO evidence_tags (id, name, description, color) VALUES
(UUID(), 'urgent', 'Bukti yang memerlukan perhatian segera', '#EF4444'),
(UUID(), 'verified', 'Bukti yang sudah diverifikasi', '#10B981'),
(UUID(), 'incomplete', 'Bukti yang belum lengkap', '#F59E0B'),
(UUID(), 'confidential', 'Bukti yang bersifat rahasia', '#8B5CF6'),
(UUID(), 'public', 'Bukti yang dapat diakses publik', '#3B82F6'),
(UUID(), 'archived', 'Bukti yang sudah diarsipkan', '#6B7280');

-- Create views for easier querying
CREATE VIEW evidence_with_details AS
SELECT 
    ef.*,
    u1.name as uploaded_by_name,
    u1.institution as uploader_institution,
    u2.name as reviewed_by_name,
    ec.name as category_name,
    ec.icon as category_icon,
    ec.color as category_color,
    mi.temuan,
    mi.rekomendasi,
    mr.title as matrix_title,
    mr.target_opd
FROM evidence_files ef
LEFT JOIN users u1 ON ef.uploaded_by = u1.id
LEFT JOIN users u2 ON ef.reviewed_by = u2.id
LEFT JOIN evidence_categories ec ON ef.category = ec.name
LEFT JOIN matrix_items mi ON ef.matrix_item_id = mi.id
LEFT JOIN matrix_reports mr ON mi.matrix_report_id = mr.id;

-- Performance monitoring view
CREATE VIEW user_performance_summary AS
SELECT 
    u.id,
    u.name,
    u.role,
    u.institution,
    COUNT(DISTINCT ual.id) as total_activities,
    COUNT(DISTINCT DATE(ual.created_at)) as active_days,
    AVG(ual.request_duration_ms) as avg_response_time,
    MAX(ual.created_at) as last_activity,
    COUNT(DISTINCT CASE WHEN ual.action = 'upload' THEN ual.id END) as uploads_count,
    COUNT(DISTINCT CASE WHEN ual.action = 'search' THEN ual.id END) as searches_count,
    COUNT(DISTINCT CASE WHEN ual.action = 'review' THEN ual.id END) as reviews_count
FROM users u
LEFT JOIN user_activity_logs ual ON u.id = ual.user_id
WHERE u.role IN ('inspektorat', 'opd', 'super_admin')
GROUP BY u.id, u.name, u.role, u.institution;

-- System health check
CREATE VIEW system_health_summary AS
SELECT 
    component,
    metric_type,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as measurement_count,
    MAX(recorded_at) as last_recorded
FROM system_metrics 
WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY component, metric_type
ORDER BY component, metric_type;

-- Add some initial system metrics
INSERT IGNORE INTO system_metrics (id, metric_type, metric_value, metric_unit, component) VALUES
(UUID(), 'uptime', 100, '%', 'backend'),
(UUID(), 'response_time', 150, 'ms', 'backend'),
(UUID(), 'memory_usage', 45.5, '%', 'backend'),
(UUID(), 'disk_usage', 23.2, '%', 'backend'),
(UUID(), 'active_connections', 12, 'count', 'database');

-- Success message
SELECT 'Evidence management system created successfully!' as message;