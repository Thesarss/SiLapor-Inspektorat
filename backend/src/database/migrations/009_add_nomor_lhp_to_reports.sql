-- Add nomor_lhp field to reports table
ALTER TABLE reports ADD COLUMN nomor_lhp VARCHAR(100) UNIQUE NULL AFTER title;

-- Create index for nomor_lhp
CREATE INDEX idx_reports_nomor_lhp ON reports(nomor_lhp);
