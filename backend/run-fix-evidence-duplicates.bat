@echo off
echo ========================================
echo Fix Evidence Duplicates Migration
echo ========================================
echo.

REM Load environment variables
if exist .env (
    echo Loading environment variables...
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        set "%%a=%%b"
    )
)

echo Running migration 026_fix_evidence_duplicates.sql...
echo.

mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < src/database/migrations/026_fix_evidence_duplicates.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migration completed successfully!
    echo ========================================
    echo.
    echo The matrix_evidence_tracking view has been updated to prevent duplicates.
    echo.
) else (
    echo.
    echo ========================================
    echo Migration failed!
    echo ========================================
    echo Please check the error messages above.
    echo.
)

pause
