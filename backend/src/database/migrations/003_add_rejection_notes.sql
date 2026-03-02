-- Migration: Add rejection_notes to reports table
-- Run this in phpMyAdmin or MySQL CLI

USE evaluation_reporting;

-- Add rejection_notes column to store rejection reason
ALTER TABLE reports ADD COLUMN rejection_notes TEXT NULL AFTER status;
