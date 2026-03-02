-- Migration: Create Matrix Templates for Inspektorat
-- This allows Inspektorat to create evaluation matrices for OPDs

-- Matrix Templates table
CREATE TABLE IF NOT EXISTS matrix_templates (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(36) NOT NULL,
    target_institution VARCHAR(255),
    template_type ENUM('evaluation', 'audit', 'monitoring', 'assessment') DEFAULT 'evaluation',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Matrix Fields table (defines the structure of the matrix)
CREATE TABLE IF NOT EXISTS matrix_fields (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_type ENUM('text', 'number', 'date', 'select', 'textarea', 'file') DEFAULT 'text',
    field_options JSON, -- For select fields, stores options
    is_required BOOLEAN DEFAULT FALSE,
    field_order INT DEFAULT 0,
    validation_rules JSON, -- Stores validation rules
    help_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES matrix_templates(id) ON DELETE CASCADE
);

-- Matrix Assignments table (assigns templates to specific OPDs)
CREATE TABLE IF NOT EXISTS matrix_assignments (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    assigned_to VARCHAR(36) NOT NULL, -- OPD user ID
    assigned_by VARCHAR(36) NOT NULL, -- Inspektorat user ID
    status ENUM('pending', 'in_progress', 'submitted', 'reviewed', 'approved', 'rejected') DEFAULT 'pending',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    reviewed_at TIMESTAMP NULL,
    due_date DATE,
    notes TEXT,
    FOREIGN KEY (template_id) REFERENCES matrix_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Matrix Responses table (stores OPD responses to the matrix)
CREATE TABLE IF NOT EXISTS matrix_responses (
    id VARCHAR(36) PRIMARY KEY,
    assignment_id VARCHAR(36) NOT NULL,
    field_id VARCHAR(36) NOT NULL,
    response_value TEXT,
    file_path VARCHAR(500), -- For file uploads
    responded_by VARCHAR(36) NOT NULL,
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES matrix_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES matrix_fields(id) ON DELETE CASCADE,
    FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_response (assignment_id, field_id)
);

-- Matrix Reviews table (Inspektorat reviews of OPD responses)
CREATE TABLE IF NOT EXISTS matrix_reviews (
    id VARCHAR(36) PRIMARY KEY,
    assignment_id VARCHAR(36) NOT NULL,
    reviewed_by VARCHAR(36) NOT NULL,
    overall_score DECIMAL(5,2),
    review_notes TEXT,
    recommendations TEXT,
    status ENUM('approved', 'rejected', 'needs_revision') DEFAULT 'needs_revision',
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES matrix_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Matrix Field Reviews table (detailed review per field)
CREATE TABLE IF NOT EXISTS matrix_field_reviews (
    id VARCHAR(36) PRIMARY KEY,
    review_id VARCHAR(36) NOT NULL,
    field_id VARCHAR(36) NOT NULL,
    score DECIMAL(5,2),
    comments TEXT,
    status ENUM('satisfactory', 'needs_improvement', 'unsatisfactory') DEFAULT 'needs_improvement',
    FOREIGN KEY (review_id) REFERENCES matrix_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES matrix_fields(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_matrix_templates_created_by ON matrix_templates(created_by);
CREATE INDEX idx_matrix_templates_status ON matrix_templates(status);
CREATE INDEX idx_matrix_assignments_assigned_to ON matrix_assignments(assigned_to);
CREATE INDEX idx_matrix_assignments_status ON matrix_assignments(status);
CREATE INDEX idx_matrix_responses_assignment_id ON matrix_responses(assignment_id);
CREATE INDEX idx_matrix_reviews_assignment_id ON matrix_reviews(assignment_id);