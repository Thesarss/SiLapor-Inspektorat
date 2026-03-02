-- Update user roles to support new role system
-- New roles: super_admin, inspektorat, opd

-- Add new role enum values
ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'inspektorat', 'opd', 'admin', 'user') NOT NULL DEFAULT 'opd';

-- Update existing users to new role system
UPDATE users SET role = 'super_admin' WHERE role = 'admin' AND username = 'admin';
UPDATE users SET role = 'opd' WHERE role = 'user';

-- Add can_manage_users column to track user management permissions
ALTER TABLE users ADD COLUMN can_manage_users BOOLEAN DEFAULT FALSE;

-- Set permissions
UPDATE users SET can_manage_users = TRUE WHERE role = 'super_admin';
UPDATE users SET can_manage_users = FALSE WHERE role IN ('inspektorat', 'opd');

-- Add role descriptions
ALTER TABLE users ADD COLUMN role_description VARCHAR(255) DEFAULT NULL;

UPDATE users SET role_description = 'Super Administrator - Full system access' WHERE role = 'super_admin';
UPDATE users SET role_description = 'Inspektorat - Review and audit reports' WHERE role = 'inspektorat';
UPDATE users SET role_description = 'OPD - Submit and respond to reports' WHERE role = 'opd';

-- Create sample inspektorat users
INSERT INTO users (id, username, email, password_hash, name, role, role_description, can_manage_users, institution) VALUES
    ('i1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'inspektorat1', 'inspektorat1@tanjungpinang.go.id', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Inspektorat User 1', 'inspektorat', 'Inspektorat - Review and audit reports', FALSE, 'Inspektorat Kota Tanjungpinang'),
    ('i2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'inspektorat2', 'inspektorat2@tanjungpinang.go.id', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Inspektorat User 2', 'inspektorat', 'Inspektorat - Review and audit reports', FALSE, 'Inspektorat Kota Tanjungpinang')
ON DUPLICATE KEY UPDATE username = username;

-- Update existing OPD users with proper institutions
UPDATE users SET 
    role = 'opd',
    role_description = 'OPD - Submit and respond to reports',
    can_manage_users = FALSE
WHERE role = 'user' OR username LIKE 'user%';