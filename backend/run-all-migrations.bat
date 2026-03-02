@echo off
echo ========================================
echo Running ALL Database Migrations
echo ========================================
echo.
echo Make sure XAMPP MySQL is running!
echo.

echo Running migration 001: Initial schema...
mysql -u root < src/database/migrations/001_mysql_schema.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration 001 failed!
    pause
    exit /b 1
)
echo Migration 001 completed successfully!
echo.

echo Running migration 002: Add report files...
mysql -u root evaluation_reporting < src/database/migrations/002_add_report_files.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration 002 failed!
    pause
    exit /b 1
)
echo Migration 002 completed successfully!
echo.

echo Running migration 003: Add rejection notes...
mysql -u root evaluation_reporting < src/database/migrations/003_add_rejection_notes.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration 003 failed!
    pause
    exit /b 1
)
echo Migration 003 completed successfully!
echo.

echo Running migration 004: Create revision items...
mysql -u root evaluation_reporting < src/database/migrations/004_create_revision_items.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration 004 failed!
    pause
    exit /b 1
)
echo Migration 004 completed successfully!
echo.

echo Running migration 005: Add needs_revision status...
mysql -u root evaluation_reporting < src/database/migrations/005_add_needs_revision_status.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration 005 failed!
    pause
    exit /b 1
)
echo Migration 005 completed successfully!
echo.

echo Running migration 006: Add institution and recommendation...
mysql -u root evaluation_reporting < src/database/migrations/006_add_institution_and_recommendation.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration 006 failed!
    pause
    exit /b 1
)
echo Migration 006 completed successfully!
echo.

echo Running migration 007: Create metrics table...
mysql -u root evaluation_reporting < src/database/migrations/007_create_metrics_table.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration 007 failed!
    pause
    exit /b 1
)
echo Migration 007 completed successfully!
echo.

echo ========================================
echo All migrations completed successfully!
echo ========================================
pause
