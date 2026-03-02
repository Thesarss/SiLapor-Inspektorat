@echo off
echo ========================================
echo Running Database Migrations
echo ========================================
echo.
echo Make sure XAMPP MySQL is running!
echo.
echo Running migration 004: Create revision tables...
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
echo ========================================
echo All migrations completed successfully!
echo ========================================
pause
