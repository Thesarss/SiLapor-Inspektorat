-- Add session management for multi-user access (MySQL Compatible)
-- This enables concurrent sessions and device tracking

USE evaluation_reporting;

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
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Add session limits per role
ALTER TABLE users ADD COLUMN max_concurrent_sessions INT DEFAULT 2;

-- Set session limits based on role
UPDATE users SET max_concurrent_sessions = 3 WHERE role = 'super_admin';
UPDATE users SET max_concurrent_sessions = 2 WHERE role = 'inspektorat';
UPDATE users SET max_concurrent_sessions = 2 WHERE role = 'opd';

-- Add last login tracking
ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL;
ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45) NULL;
ALTER TABLE users ADD COLUMN login_count INT DEFAULT 0;

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
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL
);

-- Add indexes for activity log
CREATE INDEX idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_session_id ON user_activity_log(session_id);
CREATE INDEX idx_activity_created_at ON user_activity_log(created_at);

-- Add institution-based permissions
ALTER TABLE users ADD COLUMN department VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN position VARCHAR(100) NULL;

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