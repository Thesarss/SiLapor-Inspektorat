-- Create table for follow-up items from import
-- Each recommendation can have multiple follow-up actions

CREATE TABLE IF NOT EXISTS followup_items (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) NOT NULL,
  import_detail_id VARCHAR(36) NOT NULL,
  temuan TEXT NOT NULL,
  rekomendasi TEXT NOT NULL,
  tindak_lanjut TEXT,
  status ENUM('pending', 'in_progress', 'completed', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  opd_response TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (import_detail_id) REFERENCES imported_reports(id) ON DELETE CASCADE,
  INDEX idx_report_id (report_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Create table for follow-up item files
CREATE TABLE IF NOT EXISTS followup_item_files (
  id VARCHAR(36) PRIMARY KEY,
  followup_item_id VARCHAR(36) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  uploaded_by VARCHAR(36) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (followup_item_id) REFERENCES followup_items(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_followup_item_id (followup_item_id),
  INDEX idx_uploaded_by (uploaded_by)
);