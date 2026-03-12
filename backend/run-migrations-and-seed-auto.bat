@echo off
echo ========================================
echo Running Database Migrations and Seed
echo ========================================
echo.
echo Make sure XAMPP MySQL is running!
echo.

SET MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL_PATH%" (
    echo ERROR: MySQL not found at %MYSQL_PATH%
    echo Please update MYSQL_PATH in this script
    exit /b 1
)

echo Running migration 001: Initial schema...
"%MYSQL_PATH%" -u root < src/database/migrations/001_mysql_schema.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 001 failed!
    exit /b 1
)
echo Migration 001 completed successfully!
echo.

echo Running migration 002: Add report files...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/002_add_report_files.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 002 failed!
    exit /b 1
)
echo Migration 002 completed successfully!
echo.

echo Running migration 003: Add rejection notes...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/003_add_rejection_notes.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 003 failed!
    exit /b 1
)
echo Migration 003 completed successfully!
echo.

echo Running migration 004: Create revision items...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/004_create_revision_items.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 004 failed!
    exit /b 1
)
echo Migration 004 completed successfully!
echo.

echo Running migration 005: Add needs_revision status...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/005_add_needs_revision_status.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 005 failed!
    exit /b 1
)
echo Migration 005 completed successfully!
echo.

echo Running migration 006: Add institution and recommendation...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/006_add_institution_and_recommendation.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 006 failed!
    exit /b 1
)
echo Migration 006 completed successfully!
echo.

echo Running migration 007: Create metrics table...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/007_create_metrics_table.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 007 failed!
    exit /b 1
)
echo Migration 007 completed successfully!
echo.

echo Running migration 008: Create file import tables...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/008_create_file_import_tables.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 008 failed!
    exit /b 1
)
echo Migration 008 completed successfully!
echo.

echo Running migration 009: Add nomor_lhp to reports...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/009_add_nomor_lhp_to_reports.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 009 failed!
    exit /b 1
)
echo Migration 009 completed successfully!
echo.

echo Running migration 010: Fix imported reports constraint...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/010_fix_imported_reports_constraint.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 010 failed!
    exit /b 1
)
echo Migration 010 completed successfully!
echo.

echo Running migration 011: Create followup items table...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/011_create_followup_items_table.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 011 failed!
    exit /b 1
)
echo Migration 011 completed successfully!
echo.

echo Running migration 012: Add followup item recommendations...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/012_add_followup_item_recommendations.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 012 failed!
    exit /b 1
)
echo Migration 012 completed successfully!
echo.

echo Running migration 013: Add username and user management...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/013_add_username_and_user_management.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 013 failed!
    exit /b 1
)
echo Migration 013 completed successfully!
echo.

echo Running migration 015: Add admin notes to recommendations...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/015_add_admin_notes_to_recommendations.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 015 failed!
    exit /b 1
)
echo Migration 015 completed successfully!
echo.

echo Running migration 016: Update user roles...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/016_update_user_roles.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 016 failed!
    exit /b 1
)
echo Migration 016 completed successfully!
echo.

echo Running migration 017: Add session management...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/017_add_session_management_simple.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 017 failed!
    exit /b 1
)
echo Migration 017 completed successfully!
echo.

echo Running migration 018: Create matrix templates...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/018_create_matrix_templates.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 018 failed!
    exit /b 1
)
echo Migration 018 completed successfully!
echo.

echo Running migration 019: Create matrix audit system...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/019_create_matrix_audit_system_fixed.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 019 failed!
    exit /b 1
)
echo Migration 019 completed successfully!
echo.

echo Running migration 020: Add performance indexes...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/020_add_performance_indexes.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 020 failed!
    exit /b 1
)
echo Migration 020 completed successfully!
echo.

echo Running migration 021: Create evidence system...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/021_create_evidence_system_simple.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 021 failed!
    exit /b 1
)
echo Migration 021 completed successfully!
echo.

echo Running migration 022: Fix evidence system...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/022_fix_evidence_system.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 022 failed!
    exit /b 1
)
echo Migration 022 completed successfully!
echo.

echo Running migration 023: Integrate evidence matrix...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/023_integrate_evidence_matrix.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 023 failed!
    exit /b 1
)
echo Migration 023 completed successfully!
echo.

echo Running migration 024: Add user profile photo...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/024_add_user_profile_photo.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 024 failed!
    exit /b 1
)
echo Migration 024 completed successfully!
echo.

echo Running migration 025: Fix matrix data sync...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/025_fix_matrix_data_sync.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 025 failed!
    exit /b 1
)
echo Migration 025 completed successfully!
echo.

echo Running migration 026: Fix evidence duplicates...
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/migrations/026_fix_evidence_duplicates.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Migration 026 failed!
    exit /b 1
)
echo Migration 026 completed successfully!
echo.

echo ========================================
echo Running Seed Data...
echo ========================================
"%MYSQL_PATH%" -u root evaluation_reporting < src/database/seed.sql 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Seed data failed!
    exit /b 1
)
echo Seed data completed successfully!
echo.

echo ========================================
echo All migrations and seed completed!
echo ========================================
echo.
echo Default users created:
echo - admin / password123 (Admin)
echo - user1-7 / password123 (Users)
echo.
