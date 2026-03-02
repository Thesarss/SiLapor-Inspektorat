-- Migration: Add report_id to evidence_files table
-- This allows files to be attached directly to reports (not just follow_ups)
-- Run this in phpMyAdmin or MySQL CLI

USE evaluation_reporting;

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE evidence_files DROP FOREIGN KEY evidence_files_ibfk_1;

-- Step 2: Modify follow_up_id to be nullable
ALTER TABLE evidence_files MODIFY follow_up_id VARCHAR(36) NULL;

-- Step 3: Add report_id column
ALTER TABLE evidence_files ADD COLUMN report_id VARCHAR(36) NULL AFTER follow_up_id;

-- Step 4: Add foreign key for report_id
ALTER TABLE evidence_files ADD CONSTRAINT fk_evidence_files_report 
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE;

-- Step 5: Re-add foreign key for follow_up_id (now nullable)
ALTER TABLE evidence_files ADD CONSTRAINT fk_evidence_files_followup 
    FOREIGN KEY (follow_up_id) REFERENCES follow_ups(id) ON DELETE CASCADE;

-- Step 6: Add index for report_id
CREATE INDEX idx_evidence_files_report_id ON evidence_files(report_id);
