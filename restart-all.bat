@echo off
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  Restart All Services                                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo Step 1: Stopping all Node.js processes...
echo ========================================
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo    ✅ All processes stopped
echo.

echo Step 2: Starting backend...
echo ========================================
cd backend
start "Backend Server" cmd /k "npm run dev"
cd ..
timeout /t 5 /nobreak >nul
echo    ✅ Backend started
echo.

echo Step 3: Starting frontend...
echo ========================================
cd frontend
start "Frontend Server" cmd /k "npm run dev"
cd ..
timeout /t 3 /nobreak >nul
echo    ✅ Frontend started
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║  ✅ ALL SERVICES STARTED                                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Next steps:
echo 1. Wait 10 seconds for servers to fully start
echo 2. Open browser: http://localhost:5173
echo 3. Clear cache: Ctrl + Shift + Delete
echo 4. Refresh: Ctrl + F5
echo 5. Login and test
echo.
pause
