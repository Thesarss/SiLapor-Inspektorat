-- Migration 025: Fix Matrix Data Synchronization
-- This migration consolidates evidence storage and fixes progress tracking

-- Step 1: Migrate existing evidence from matrix_items to evidence_files
-- Only migrate if evidence_filename is not null and record doesn't exist in evidence_files
INSERT INTO evidence_files (
    matrix_item_id,
    original_filename,
    file_path,
    file_size,
    uploaded_by,
    uploaded_at,
    created_at
)
SELECT 
    mi.id,
    mi.evidence_filename,
    mi.evidence_file_path,
    COALESCE(mi.evidence_file_size, 0),
    ma.assigned_to,
    mi.updated_at,
    mi.updated_at
FROM matrix_items mi
JOIN matrix_assignments ma ON mi.matrix_report_id = ma.matrix_report_id
WHERE mi.evidence_filename IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM evidence_files ef 
    WHERE ef.matrix_item_id = mi.id 
    AND ef.original_filename = mi.evidence_filename
);

-- Step 2: Add evidence_count column to matrix_items for quick access
ALTER TABLE matrix_items 
ADD COLUMN IF NOT EXISTS evidence_count INT DEFAULT 0;

-- Step 3: Update evidence_count based on evidence_files
UPDATE matrix_items mi
SET evidence_count = (
    SELECT COUNT(*) 
    FROM evidence_files ef 
    WHERE ef.matrix_item_id = mi.id
);

-- Step 4: Remove old evidence columns from matrix_items (keep for now, mark as deprecated)
-- We'll keep these columns for backward compatibility but won't use them
-- ALTER TABLE matrix_items DROP COLUMN evidence_filename;
-- ALTER TABLE matrix_items DROP COLUMN evidence_file_path;
-- ALTER TABLE matrix_items DROP COLUMN evidence_file_size;

-- Step 5: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matrix_items_status ON matrix_items(status);
CREATE INDEX IF NOT EXISTS idx_matrix_items_report_status ON matrix_items(matrix_report_id, status);
CREATE INDEX IF NOT EXISTS idx_matrix_assignments_status ON matrix_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_evidence_files_item ON evidence_files(matrix_item_id);

-- Step 6: Create trigger to update evidence_count when evidence is added/removed
DELIMITER //

DROP TRIGGER IF EXISTS update_evidence_count_after_insert//
CREATE TRIGGER update_evidence_count_after_insert
AFTER INSERT ON evidence_files
FOR EACH ROW
BEGIN
    UPDATE matrix_items 
    SET evidence_count = evidence_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.matrix_item_id;
END//

DROP TRIGGER IF EXISTS update_evidence_count_after_delete//
CREATE TRIGGER update_evidence_count_after_delete
AFTER DELETE ON evidence_files
FOR EACH ROW
BEGIN
    UPDATE matrix_items 
    SET evidence_count = GREATEST(0, evidence_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.matrix_item_id;
END//

-- Step 7: Create trigger to update matrix_reports.completed_items when item status changes
DROP TRIGGER IF EXISTS update_report_progress_after_item_update//
CREATE TRIGGER update_report_progress_after_item_update
AFTER UPDATE ON matrix_items
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        UPDATE matrix_reports mr
        SET completed_items = (
            SELECT COUNT(*) 
            FROM matrix_items mi 
            WHERE mi.matrix_report_id = NEW.matrix_report_id 
            AND mi.status = 'approved'
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE mr.id = NEW.matrix_report_id;
    END IF;
END//

-- Step 8: Create trigger to update assignment status based on items
DROP TRIGGER IF EXISTS update_assignment_status_after_item_update//
CREATE TRIGGER update_assignment_status_after_item_update
AFTER UPDATE ON matrix_items
FOR EACH ROW
BEGIN
    DECLARE total_items INT;
    DECLARE submitted_items INT;
    DECLARE approved_items INT;
    DECLARE assignment_id VARCHAR(36);
    
    -- Get assignment ID for this item
    SELECT ma.id INTO assignment_id
    FROM matrix_assignments ma
    WHERE ma.matrix_report_id = NEW.matrix_report_id
    LIMIT 1;
    
    IF assignment_id IS NOT NULL THEN
        -- Count items
        SELECT 
            COUNT(*),
            SUM(CASE WHEN status IN ('submitted', 'approved', 'rejected') THEN 1 ELSE 0 END),
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)
        INTO total_items, submitted_items, approved_items
        FROM matrix_items
        WHERE matrix_report_id = NEW.matrix_report_id;
        
        -- Update assignment status
        IF approved_items = total_items THEN
            -- All items approved
            UPDATE matrix_assignments
            SET status = 'completed',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = assignment_id;
        ELSEIF submitted_items > 0 THEN
            -- At least one item submitted
            UPDATE matrix_assignments
            SET status = 'in_progress',
                started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
            WHERE id = assignment_id AND status = 'pending';
        END IF;
    END IF;
END//

DELIMITER ;

-- Step 9: Fix existing progress counts
UPDATE matrix_reports mr
SET completed_items = (
    SELECT COUNT(*) 
    FROM matrix_items mi 
    WHERE mi.matrix_report_id = mr.id 
    AND mi.status = 'approved'
),
updated_at = CURRENT_TIMESTAMP;

-- Step 10: Fix existing assignment statuses
UPDATE matrix_assignments ma
SET status = CASE
    WHEN (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = ma.matrix_report_id AND mi.status = 'approved') = 
         (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = ma.matrix_report_id) 
    THEN 'completed'
    WHEN (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = ma.matrix_report_id AND mi.status IN ('submitted', 'approved', 'rejected')) > 0 
    THEN 'in_progress'
    ELSE 'pending'
END,
updated_at = CURRENT_TIMESTAMP;

-- Step 11: Add cascade delete for orphaned evidence
-- This ensures evidence_files are deleted when matrix_items are deleted
ALTER TABLE evidence_files
DROP FOREIGN KEY IF EXISTS fk_evidence_matrix_item;

ALTER TABLE evidence_files
ADD CONSTRAINT fk_evidence_matrix_item
FOREIGN KEY (matrix_item_id) REFERENCES matrix_items(id)
ON DELETE CASCADE;

