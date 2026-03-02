-- Add admin_notes column to followup_item_recommendations table
-- This allows admin to provide feedback when rejecting individual recommendations

ALTER TABLE followup_item_recommendations 
ADD COLUMN admin_notes TEXT NULL AFTER status;