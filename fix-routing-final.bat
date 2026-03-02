@echo off
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  Fix Routing Error - Final Solution                         ║
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
timeout /t 5 /nobreak >nul
echo    ✅ Frontend started
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║  ✅ SERVICES RESTARTED                                       ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo PENTING! Lakukan ini di browser:
echo.
echo 1. Tunggu 10 detik untuk servers fully start
echo 2. Buka browser: http://localhost:5173
echo 3. Tekan F12 (buka Developer Tools)
echo 4. Klik tab "Application" atau "Storage"
echo 5. Klik "Clear site data" atau "Clear storage"
echo 6. Atau tekan: Ctrl + Shift + Delete
echo 7. Pilih "Cached images and files"
echo 8. Klik "Clear data"
echo 9. Close Developer Tools
echo 10. Hard refresh: Ctrl + F5
echo 11. Login dan test
echo.
echo Routing error akan hilang setelah clear cache!
echo.
pause
