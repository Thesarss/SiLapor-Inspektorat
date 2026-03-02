-- Migration: Add username field and user management features
-- Date: 2026-01-23

-- Add username field to users table
ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;

-- Update existing users with default usernames
UPDATE users SET username = 'admin' WHERE email = 'admin@example.com';
UPDATE users SET username = 'user1' WHERE email = 'user1@example.com';
UPDATE users SET username = 'user2' WHERE email = 'user2@example.com';

-- Make username NOT NULL after setting default values
ALTER TABLE users MODIFY COLUMN username VARCHAR(50) NOT NULL;

-- Add index for faster username lookups
CREATE INDEX idx_users_username ON users(username);