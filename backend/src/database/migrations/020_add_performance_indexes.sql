-- Performance optimization indexes
-- Add indexes for frequently queried columns

USE evaluation_reporting;

-- Helper procedure to create index if not exists
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

-- Reports table indexes
CALL create_index_if_not_exists('reports', 'idx_reports_assigned_to', 'assigned_to');
CALL create_index_if_not_exists('reports', 'idx_reports_created_by', 'created_by');
CALL create_index_if_not_exists('reports', 'idx_reports_created_at', 'created_at');
CALL create_index_if_not_exists('reports', 'idx_reports_status_assigned', 'status, assigned_to');

-- Users table indexes
CALL create_index_if_not_exists('users', 'idx_users_institution', 'institution');
CALL create_index_if_not_exists('users', 'idx_users_role', 'role');
CALL create_index_if_not_exists('users', 'idx_users_username', 'username');
CALL create_index_if_not_exists('users', 'idx_users_email', 'email');

-- Check and create indexes for optional tables
-- Followup items
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'followup_items');

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("followup_items", "idx_followup_items_report_id", "report_id")', 
    'SELECT "Skipping followup_items indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("followup_items", "idx_followup_items_status", "status")', 
    'SELECT "Skipping followup_items indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Followup recommendations
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'followup_item_recommendations');

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("followup_item_recommendations", "idx_followup_item_recommendations_followup_item_id", "followup_item_id")', 
    'SELECT "Skipping followup_item_recommendations indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("followup_item_recommendations", "idx_followup_item_recommendations_status", "status")', 
    'SELECT "Skipping followup_item_recommendations indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Metrics table
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'metrics');

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("metrics", "idx_metrics_report_id", "report_id")', 
    'SELECT "Skipping metrics indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("metrics", "idx_metrics_created_at", "created_at")', 
    'SELECT "Skipping metrics indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Revision items
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'revision_items');

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("revision_items", "idx_revision_items_report_id", "report_id")', 
    'SELECT "Skipping revision_items indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("revision_items", "idx_revision_items_status", "status")', 
    'SELECT "Skipping revision_items indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Matrix assignments
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'matrix_assignments');

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("matrix_assignments", "idx_matrix_assignments_assigned_to", "assigned_to")', 
    'SELECT "Skipping matrix_assignments indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("matrix_assignments", "idx_matrix_assignments_status", "status")', 
    'SELECT "Skipping matrix_assignments indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Matrix templates
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'matrix_templates');

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("matrix_templates", "idx_matrix_templates_created_by", "created_by")', 
    'SELECT "Skipping matrix_templates indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@table_exists > 0, 
    'CALL create_index_if_not_exists("matrix_templates", "idx_matrix_templates_status", "status")', 
    'SELECT "Skipping matrix_templates indexes"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Clean up
DROP PROCEDURE IF EXISTS create_index_if_not_exists;
