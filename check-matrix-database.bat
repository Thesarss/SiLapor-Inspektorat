@echo off
echo ========================================
echo Checking Matrix Database
echo ========================================
echo.

REM Get database credentials from .env
set DB_NAME=inspektorat_db
set DB_USER=root
set DB_PASS=

echo Checking if matrix_items table exists...
echo.

mysql -u %DB_USER% %DB_NAME% -e "SHOW TABLES LIKE 'matrix_items';"

echo.
echo Checking table structure...
echo.

mysql -u %DB_USER% %DB_NAME% -e "DESCRIBE matrix_items;"

echo.
echo Checking sample data...
echo.

mysql -u %DB_USER% %DB_NAME% -e "SELECT id, status, reviewed_by, reviewed_at FROM matrix_items ORDER BY created_at DESC LIMIT 5;"

echo.
echo ========================================
echo Check complete!
echo ========================================
pause
