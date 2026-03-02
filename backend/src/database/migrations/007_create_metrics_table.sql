-- Migration: Create metrics and findings classification table
-- Run this in phpMyAdmin or MySQL CLI

USE evaluation_reporting;

-- Create findings_categories table
CREATE TABLE IF NOT EXISTS findings_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#b91c1c',
    icon VARCHAR(50) DEFAULT '📋',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    finding_number VARCHAR(50),
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INT,
    uploaded_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES findings_categories(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_metrics_report_id ON metrics(report_id);
CREATE INDEX idx_metrics_category_id ON metrics(category_id);
CREATE INDEX idx_metrics_status ON metrics(status);
CREATE INDEX idx_metrics_severity ON metrics(severity);

-- Insert default categories
INSERT INTO findings_categories (id, name, description, color, icon, sort_order) VALUES
('cat-001', 'Temuan', 'Temuan utama dari evaluasi', '#dc2626', '🔴', 1),
('cat-002', 'Rekomendasi', 'Rekomendasi perbaikan', '#f59e0b', '💡', 2),
('cat-003', 'Kekuatan', 'Aspek yang sudah baik', '#10b981', '✅', 3),
('cat-004', 'Lain-lain', 'Catatan dan informasi lainnya', '#6b7280', '📝', 4);
