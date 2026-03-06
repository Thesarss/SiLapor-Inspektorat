-- Migration 026: Fix Evidence Duplicates
-- Fix the matrix_evidence_tracking view to avoid duplicates when multiple assignments exist

START TRANSACTION;

-- Drop the old view
DROP VIEW IF EXISTS matrix_evidence_tracking;

-- Recreate the view with DISTINCT to avoid duplicates
-- Group by matrix_item to ensure one row per item regardless of assignments
CREATE OR REPLACE VIEW matrix_evidence_tracking AS
SELECT DISTINCT
    mi.id as matrix_item_id,
    mi.matrix_report_id,
    mi.item_number,
    mi.temuan,
    mi.penyebab,
    mi.rekomendasi,
    mi.tindak_lanjut,
    mi.status as item_status,
    mi.reviewed_at,
    mr.title as matrix_title,
    mr.target_opd,
    -- Get the first assigned user (in case of multiple assignments)
    (SELECT ma.assigned_to FROM matrix_assignments ma 
     WHERE ma.matrix_report_id = mr.id LIMIT 1) as opd_user_id,
    (SELECT u.name FROM matrix_assignments ma 
     JOIN users u ON ma.assigned_to = u.id
     WHERE ma.matrix_report_id = mr.id LIMIT 1) as opd_user_name,
    (SELECT u.institution FROM matrix_assignments ma 
     JOIN users u ON ma.assigned_to = u.id
     WHERE ma.matrix_report_id = mr.id LIMIT 1) as opd_institution,
    -- Evidence information
    COALESCE(
        (SELECT COUNT(*) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        0
    ) as evidence_count,
    COALESCE(
        (SELECT GROUP_CONCAT(ef.original_filename SEPARATOR ', ') 
         FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        NULL
    ) as evidence_files,
    COALESCE(
        (SELECT MAX(ef.uploaded_at) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        NULL
    ) as last_evidence_upload,
    COALESCE(
        (SELECT ef.status FROM evidence_files ef WHERE ef.matrix_item_id = mi.id ORDER BY ef.uploaded_at DESC LIMIT 1), 
        NULL
    ) as latest_evidence_status
FROM matrix_items mi
JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
ORDER BY mr.created_at DESC, mi.item_number ASC;

COMMIT;
