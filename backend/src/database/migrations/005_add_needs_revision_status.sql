-- Migration: Add needs_revision status to reports
-- Run this in phpMyAdmin or MySQL CLI

USE evaluation_reporting;

-- Modify the status enum to include needs_revision
ALTER TABLE reports 
MODIFY COLUMN status ENUM('pending', 'in_progress', 'approved', 'rejected', 'needs_revision') NOT NULL DEFAULT 'pending';
