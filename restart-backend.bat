@echo off
echo ========================================
echo   RESTART BACKEND SERVER
echo ========================================
echo.

echo Step 1: Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% == 0 (
    echo    ✓ Node.js processes stopped
) else (
    echo    ℹ No Node.js processes were running
)
echo.

echo Step 2: Waiting for processes to close...
timeout /t 2 /nobreak >nul
echo    ✓ Wait complete
echo.

echo Step 3: Starting backend server...
cd backend
echo    Starting: npm run dev
echo.
echo ========================================
echo   BACKEND CONSOLE OUTPUT
echo ========================================
echo.
npm run dev
