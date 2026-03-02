@echo off
echo ========================================
echo   FORCE RESTART BACKEND SERVER
echo ========================================
echo.

echo Step 1: Killing ALL Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% == 0 (
    echo    ✓ Node.js processes killed
) else (
    echo    ℹ No Node.js processes were running
)
echo.

echo Step 2: Waiting 3 seconds...
timeout /t 3 /nobreak >nul
echo    ✓ Wait complete
echo.

echo Step 3: Clearing any port locks...
echo    Checking port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo    Found process on port 3000: %%a
    taskkill /F /PID %%a 2>nul
)
echo    ✓ Port 3000 cleared
echo.

echo Step 4: Starting backend server...
cd backend
echo    Starting: npm run dev
echo.
echo ========================================
echo   BACKEND CONSOLE - WATCH FOR LOGS
echo ========================================
echo.
echo IMPORTANT: Watch for these logs when you upload:
echo   🚀 UPLOAD-AUTO ENDPOINT HIT
echo   📦 Multer middleware callback
echo   ✅ Success or ❌ Error messages
echo.
npm run dev
