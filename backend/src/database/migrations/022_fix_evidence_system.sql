-- Fix evidence system to match service expectations

-- Drop existing evidence_files table and recreate with correct structure
DROP TABLE IF EXISTS evidence_files;

-- Create evidence_files table with correct structure
CREATE TABLE evidence_files (
  id VARCHAR(36) PRIMARY KEY,
  matrix_item_id VARCHAR(36),
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  file_type VARCHAR(50),
  mime_type VARCHAR(100),
  description TEXT,
  category VARCHAR(100),
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  uploaded_by VARCHAR(36) NOT NULL,
  reviewed_by VARCHAR(36),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  searchable_content TEXT,
  metadata JSON,
  INDEX idx_matrix_item (matrix_item_id),
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_uploaded_at (uploaded_at),
  FOREIGN KEY (matrix_item_id) REFERENCES matrix_items(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create evidence_tags table if not exists
CREATE TABLE IF NOT EXISTS evidence_tags (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create evidence_file_tags junction table
CREATE TABLE IF NOT EXISTS evidence_file_tags (
  evidence_id VARCHAR(36),
  tag_id VARCHAR(36),
  PRIMARY KEY (evidence_id, tag_id),
  FOREIGN KEY (evidence_id) REFERENCES evidence_files(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES evidence_tags(id) ON DELETE CASCADE
);

-- Create evidence_search_index for full-text search
CREATE TABLE IF NOT EXISTS evidence_search_index (
  evidence_id VARCHAR(36) PRIMARY KEY,
  searchable_content TEXT,
  FULLTEXT(searchable_content),
  FOREIGN KEY (evidence_id) REFERENCES evidence_files(id) ON DELETE CASCADE
);

-- Insert default evidence tags
INSERT IGNORE INTO evidence_tags (id, name, description, color) VALUES
('tag-1', 'Dokumen', 'Dokumen pendukung', '#3B82F6'),
('tag-2', 'Foto', 'Foto evidence', '#10B981'),
('tag-3', 'Surat', 'Surat resmi', '#F59E0B'),
('tag-4', 'Laporan', 'Laporan tindak lanjut', '#EF4444'),
('tag-5', 'Bukti', 'Bukti pelaksanaan', '#8B5CF6'),
('tag-6', 'Lainnya', 'Evidence lainnya', '#6B7280');

-- Create sample evidence data for testing
INSERT IGNORE INTO evidence_files (
  id, matrix_item_id, original_filename, stored_filename, file_path, 
  file_size, file_type, mime_type, description, category, priority, 
  status, uploaded_by, uploaded_at, searchable_content
) 
SELECT 
  CONCAT('evidence-', SUBSTRING(UUID(), 1, 8)),
  mi.id,
  'sample-evidence.pdf',
  CONCAT('evidence-', SUBSTRING(UUID(), 1, 8), '.pdf'),
  CONCAT('/uploads/evidence/evidence-', SUBSTRING(UUID(), 1, 8), '.pdf'),
  1024000,
  'pdf',
  'application/pdf',
  CONCAT('Evidence untuk: ', mi.temuan),
  'Dokumen',
  'medium',
  'approved',
  ma.assigned_to,
  NOW(),
  CONCAT('Evidence dokumen ', mi.temuan, ' ', mi.rekomendasi)
FROM matrix_items mi
JOIN matrix_assignments ma ON mi.matrix_report_id = ma.matrix_report_id
WHERE mi.status = 'completed'
LIMIT 5;