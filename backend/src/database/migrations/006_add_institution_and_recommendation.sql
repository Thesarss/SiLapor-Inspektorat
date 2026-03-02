-- Migration: Add institution to users and recommendation to reports
-- Run this in phpMyAdmin or MySQL CLI

USE evaluation_reporting;

-- Add institution field to users table
ALTER TABLE users ADD COLUMN institution VARCHAR(255) DEFAULT NULL AFTER name;

-- Add recommendation field to reports table  
ALTER TABLE reports ADD COLUMN recommendation TEXT DEFAULT NULL AFTER rejection_notes;

-- Create index for institution filtering
CREATE INDEX idx_users_institution ON users(institution);
