-- Migration: Create revision_items table for tracking revision points
-- Run this in phpMyAdmin or MySQL CLI

USE evaluation_reporting;

-- Create revision_items table
CREATE TABLE IF NOT EXISTS revision_items (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL,
    item_number INT NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'completed', 'approved') NOT NULL DEFAULT 'pending',
    user_response TEXT NULL,
    admin_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Create revision_files table for files attached to revision items
CREATE TABLE IF NOT EXISTS revision_files (
    id VARCHAR(36) PRIMARY KEY,
    revision_item_id VARCHAR(36) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (revision_item_id) REFERENCES revision_items(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_revision_items_report_id ON revision_items(report_id);
CREATE INDEX idx_revision_items_status ON revision_items(status);
CREATE INDEX idx_revision_files_revision_item_id ON revision_files(revision_item_id);
