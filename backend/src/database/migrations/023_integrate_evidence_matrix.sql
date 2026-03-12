-- Migration 023: Integrate Evidence with Matrix System
-- This migration updates the evidence system to work with matrix assignments

USE evaluation_reporting;

-- Check if matrix_item_id column exists before adding
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'evidence_files' 
    AND column_name = 'matrix_item_id');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE evidence_files ADD COLUMN matrix_item_id VARCHAR(36) NULL AFTER uploaded_by', 
    'SELECT "Column matrix_item_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if assignment_id column exists before adding
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'evidence_files' 
    AND column_name = 'assignment_id');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE evidence_files ADD COLUMN assignment_id VARCHAR(36) NULL AFTER matrix_item_id', 
    'SELECT "Column assignment_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update evidence_files table structure for matrix workflow
ALTER TABLE evidence_files 
MODIFY COLUMN category VARCHAR(100) DEFAULT 'Tindak Lanjut',
MODIFY COLUMN priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
MODIFY COLUMN status ENUM('pending', 'submitted', 'approved', 'rejected', 'needs_revision') DEFAULT 'pending';

-- Add indexes for better performance (using procedure from migration 020)
DELIMITER $$

DROP PROCEDURE IF EXISTS create_index_if_not_exists$$
CREATE PROCEDURE create_index_if_not_exists(
    IN p_table_name VARCHAR(128),
    IN p_index_name VARCHAR(128),
    IN p_index_columns VARCHAR(255)
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
        AND table_name = p_table_name
        AND index_name = p_index_name;
    
    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', p_index_name, ' ON ', p_table_name, '(', p_index_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

CALL create_index_if_not_exists('evidence_files', 'idx_evidence_matrix_item', 'matrix_item_id');
CALL create_index_if_not_exists('evidence_files', 'idx_evidence_assignment', 'assignment_id');
CALL create_index_if_not_exists('evidence_files', 'idx_evidence_status_matrix', 'status, matrix_item_id');

DROP PROCEDURE IF EXISTS create_index_if_not_exists;

-- Update matrix_items table to track evidence submission (if table exists)
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'matrix_items');

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'matrix_items' 
    AND column_name = 'evidence_submitted');

SET @sql = IF(@table_exists > 0 AND @column_exists = 0, 
    'ALTER TABLE matrix_items ADD COLUMN evidence_submitted BOOLEAN DEFAULT FALSE AFTER evidence_file_size', 
    'SELECT "Skipping matrix_items.evidence_submitted"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'matrix_items' 
    AND column_name = 'evidence_count');

SET @sql = IF(@table_exists > 0 AND @column_exists = 0, 
    'ALTER TABLE matrix_items ADD COLUMN evidence_count INT DEFAULT 0 AFTER evidence_submitted', 
    'SELECT "Skipping matrix_items.evidence_count"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'matrix_items' 
    AND column_name = 'last_evidence_at');

SET @sql = IF(@table_exists > 0 AND @column_exists = 0, 
    'ALTER TABLE matrix_items ADD COLUMN last_evidence_at TIMESTAMP NULL AFTER evidence_count', 
    'SELECT "Skipping matrix_items.last_evidence_at"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add progress tracking to matrix_assignments (if table exists)
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'matrix_assignments');

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'matrix_assignments' 
    AND column_name = 'progress_percentage');

SET @sql = IF(@table_exists > 0 AND @column_exists = 0, 
    'ALTER TABLE matrix_assignments ADD COLUMN progress_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER completed_at', 
    'SELECT "Skipping matrix_assignments.progress_percentage"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'matrix_assignments' 
    AND column_name = 'items_with_evidence');

SET @sql = IF(@table_exists > 0 AND @column_exists = 0, 
    'ALTER TABLE matrix_assignments ADD COLUMN items_with_evidence INT DEFAULT 0 AFTER progress_percentage', 
    'SELECT "Skipping matrix_assignments.items_with_evidence"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'matrix_assignments' 
    AND column_name = 'total_items');

SET @sql = IF(@table_exists > 0 AND @column_exists = 0, 
    'ALTER TABLE matrix_assignments ADD COLUMN total_items INT DEFAULT 0 AFTER items_with_evidence', 
    'SELECT "Skipping matrix_assignments.total_items"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'matrix_assignments' 
    AND column_name = 'last_activity_at');

SET @sql = IF(@table_exists > 0 AND @column_exists = 0, 
    'ALTER TABLE matrix_assignments ADD COLUMN last_activity_at TIMESTAMP NULL AFTER total_items', 
    'SELECT "Skipping matrix_assignments.last_activity_at"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Evidence-Matrix integration completed successfully!' as message;
