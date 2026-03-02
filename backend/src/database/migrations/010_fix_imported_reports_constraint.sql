-- Fix imported_reports constraint to allow multiple rows per import-report combination
-- Drop the unique constraint that prevents multiple detail rows

ALTER TABLE imported_reports DROP INDEX unique_import_report;

-- Add a new unique constraint that includes row_number to allow multiple rows
ALTER TABLE imported_reports ADD UNIQUE KEY unique_import_report_row (import_id, report_id, row_number);