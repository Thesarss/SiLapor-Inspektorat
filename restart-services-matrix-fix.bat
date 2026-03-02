@echo off
echo ========================================
echo RESTART SERVICES - Matrix Upload Fix
echo ========================================
echo.

echo [1/4] Stopping backend...
cd backend
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Starting backend...
start "Backend Server" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo [3/4] Stopping frontend...
cd ..\frontend
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [4/4] Starting frontend...
start "Frontend Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

cd ..

echo.
echo ========================================
echo ✅ Services Restarted Successfully!
echo ========================================
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo IMPORTANT: Clear browser cache (Ctrl + Shift + Delete)
echo.
echo Changes Applied:
echo - Fixed matrix upload mode confusion
echo - Updated "Otomatis" mode: detects headers automatically
echo - Updated "Sederhana" mode: reads columns in order
echo - Both modes now use MatrixParserService
echo - Clearer UI labels and descriptions
echo.
pause
