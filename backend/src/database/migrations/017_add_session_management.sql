-- Add session management for multi-user access
-- This enables concurrent sessions and device tracking

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    device_info TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_token (session_token),
    INDEX idx_user_sessions_active (is_active),
    INDEX idx_user_sessions_expires (expires_at)
);

-- Add session limits per role
ALTER TABLE users ADD COLUMN max_concurrent_sessions INT DEFAULT 2;

-- Set session limits based on role
UPDATE users SET max_concurrent_sessions = 3 WHERE role = 'super_admin';
UPDATE users SET max_concurrent_sessions = 2 WHERE role = 'inspektorat';
UPDATE users SET max_concurrent_sessions = 2 WHERE role = 'opd';

-- Add last login tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0;

-- Create session cleanup procedure
DELIMITER //
CREATE PROCEDURE CleanupExpiredSessions()
BEGIN
    -- Mark expired sessions as inactive
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    -- Delete old inactive sessions (older than 7 days)
    DELETE FROM user_sessions 
    WHERE is_active = FALSE 
    AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
END //
DELIMITER ;

-- Create event to run cleanup every hour
CREATE EVENT IF NOT EXISTS cleanup_sessions
ON SCHEDULE EVERY 1 HOUR
DO CALL CleanupExpiredSessions();

-- Add user activity tracking
CREATE TABLE IF NOT EXISTS user_activity_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
    INDEX idx_activity_user_id (user_id),
    INDEX idx_activity_session_id (session_id),
    INDEX idx_activity_created_at (created_at)
);

-- Add institution-based permissions
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100) NULL DEFAULT NULL;

-- Update existing users with department info
UPDATE users SET 
    department = CASE 
        WHEN institution LIKE '%Pendidikan%' THEN 'Dinas Pendidikan'
        WHEN institution LIKE '%Kesehatan%' THEN 'Dinas Kesehatan'
        WHEN institution LIKE '%Pekerjaan Umum%' THEN 'Dinas Pekerjaan Umum'
        WHEN institution LIKE '%Sosial%' THEN 'Dinas Sosial'
        WHEN institution LIKE '%Lingkungan%' THEN 'Dinas Lingkungan Hidup'
        WHEN institution LIKE '%Perhubungan%' THEN 'Dinas Perhubungan'
        WHEN institution LIKE '%Koperasi%' THEN 'Dinas Koperasi dan UKM'
        WHEN institution LIKE '%Inspektorat%' THEN 'Inspektorat'
        ELSE institution
    END,
    position = CASE 
        WHEN username LIKE '%kepala%' THEN 'Kepala Dinas'
        WHEN username LIKE '%sekretaris%' THEN 'Sekretaris'
        WHEN username LIKE '%staff%' THEN 'Staff'
        WHEN role = 'super_admin' THEN 'Administrator'
        WHEN role = 'inspektorat' THEN 'Inspektorat'
        ELSE 'Staff'
    END
WHERE department IS NULL OR position IS NULL;