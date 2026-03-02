@echo off
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  AUTO FIX EVERYTHING - Matrix Issues                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo Step 1: Fixing database issues...
echo ========================================
node auto-fix-database.js
if %errorlevel% neq 0 (
    echo    ❌ Database fix failed
    pause
    exit /b 1
)
echo    ✅ Database fixed
echo.

echo Step 2: Killing all Node.js processes...
echo ========================================
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo    ✅ Processes killed
echo.

echo Step 3: Starting backend...
echo ========================================
cd backend
start "Backend Server" cmd /k "npm run dev"
cd ..
timeout /t 5 /nobreak >nul
echo    ✅ Backend started
echo.

echo Step 4: Verifying backend...
echo ========================================
node verify-backend-running.js
if %errorlevel% neq 0 (
    echo    ⚠️  Backend verification failed, but continuing...
)
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║  ✅ AUTO FIX COMPLETE                                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Next steps:
echo 1. Backend is now running in a separate window
echo 2. Start frontend: cd frontend ^&^& npm run dev
echo 3. Clear browser cache (Ctrl + Shift + Delete)
echo 4. Refresh browser (Ctrl + F5)
echo 5. Login and test
echo.
pause
