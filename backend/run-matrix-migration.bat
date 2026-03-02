@echo off
echo Running Matrix Audit System Migration...
echo.

set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
set DB_NAME=evaluation_reporting
set DB_USER=root
set DB_PASSWORD=

echo Checking if MySQL is accessible...
%MYSQL_PATH% --version
if errorlevel 1 (
    echo ERROR: MySQL not found at %MYSQL_PATH%
    echo Please update MYSQL_PATH in this script to match your XAMPP installation
    pause
    exit /b 1
)

echo.
echo Running migration: 019_create_matrix_audit_system_fixed.sql
%MYSQL_PATH% -u %DB_USER% %DB_NAME% < src\database\migrations\019_create_matrix_audit_system_fixed.sql
if errorlevel 1 (
    echo ERROR: Migration failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Matrix Audit System Migration Complete!
echo ========================================
echo.
echo Tables created:
echo - matrix_reports
echo - matrix_items
echo - matrix_assignments
echo - matrix_item_history
echo - matrix_upload_sessions
echo.
pause
