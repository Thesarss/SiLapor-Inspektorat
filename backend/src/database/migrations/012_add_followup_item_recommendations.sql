-- Migration to support individual recommendations with separate file uploads and status
-- Each recommendation within a followup item can have its own files and submission status

CREATE TABLE IF NOT EXISTS followup_item_recommendations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  followup_item_id VARCHAR(36) NOT NULL,
  recommendation_text TEXT NOT NULL,
  recommendation_index INT NOT NULL,
  opd_response TEXT,
  status ENUM('pending', 'submitted', 'approved', 'rejected') DEFAULT 'pending',
  submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (followup_item_id) REFERENCES followup_items(id) ON DELETE CASCADE,
  INDEX idx_followup_item_recommendations_followup_item_id (followup_item_id),
  INDEX idx_followup_item_recommendations_status (status)
);

CREATE TABLE IF NOT EXISTS followup_recommendation_files (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  recommendation_id VARCHAR(36) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  uploaded_by VARCHAR(36) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recommendation_id) REFERENCES followup_item_recommendations(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_followup_recommendation_files_recommendation_id (recommendation_id),
  INDEX idx_followup_recommendation_files_uploaded_by (uploaded_by)
);