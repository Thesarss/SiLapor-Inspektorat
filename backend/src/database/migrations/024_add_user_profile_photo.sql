-- Add profile photo column to users table

USE evaluation_reporting;

-- Check if profile_photo column exists
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND column_name = 'profile_photo');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE users ADD COLUMN profile_photo VARCHAR(500) NULL', 
    'SELECT "Column profile_photo already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if profile_photo_filename column exists
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND column_name = 'profile_photo_filename');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE users ADD COLUMN profile_photo_filename VARCHAR(255) NULL AFTER profile_photo', 
    'SELECT "Column profile_photo_filename already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for faster lookups (using procedure)
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

CALL create_index_if_not_exists('users', 'idx_users_profile_photo', 'profile_photo');

DROP PROCEDURE IF EXISTS create_index_if_not_exists;

SELECT 'User profile photo columns added successfully!' as message;
