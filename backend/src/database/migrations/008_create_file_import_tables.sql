-- Create FileImport table
CREATE TABLE IF NOT EXISTS file_imports (
  id VARCHAR(36) PRIMARY KEY,
  admin_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type ENUM('xlsx', 'xls', 'csv') NOT NULL,
  column_mapping JSON NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Create ImportedReport table
CREATE TABLE IF NOT EXISTS imported_reports (
  id VARCHAR(36) PRIMARY KEY,
  import_id VARCHAR(36) NOT NULL,
  report_id VARCHAR(36) NOT NULL,
  row_number INT NOT NULL,
  original_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_id) REFERENCES file_imports(id) ON DELETE CASCADE,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  INDEX idx_import_id (import_id),
  INDEX idx_report_id (report_id),
  UNIQUE KEY unique_import_report (import_id, report_id)
);

-- Create ImportError table
CREATE TABLE IF NOT EXISTS import_errors (
  id VARCHAR(36) PRIMARY KEY,
  import_id VARCHAR(36) NOT NULL,
  row_number INT NOT NULL,
  error_message TEXT NOT NULL,
  row_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_id) REFERENCES file_imports(id) ON DELETE CASCADE,
  INDEX idx_import_id (import_id),
  INDEX idx_row_number (row_number)
);
