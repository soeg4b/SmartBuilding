@echo off
echo ================================================
echo   INTEGRA Dashboard - Go Live Launcher
echo ================================================
echo.

echo [1/3] Starting Backend API (port 5000)...
start "API Server" /min cmd /c "cd /d %~dp0 && node demo-server.mjs"

echo [2/3] Starting Web Dashboard (port 5001)...
start "Web App" /min cmd /c "cd /d %~dp0\src\frontend && npx next dev -p 5001"

echo [3/3] Starting Mobile App - Expo Web (port 5002)...
start "Mobile App" cmd /c "cd /d %~dp0\src\mobile && npx expo start --web --port 5002 --no-dev"

echo.
echo Waiting for services to start...
timeout /t 6 /nobreak >nul

echo.
echo ================================================
echo   All services are LIVE:
echo.
echo   Web Dashboard:  http://localhost:5001
echo   Mobile App:     http://localhost:5002
echo   API Health:     http://localhost:5000/api/v1/health
echo ================================================
echo.
echo   Login Accounts:
echo     admin@integra.com    / admin123     (System Admin)
echo     cfo@integra.com      / cfo123       (CFO / Executive)
echo     tech@integra.com     / tech123      (Technician)
echo     manager@integra.com  / manager123   (Building Manager)
echo     security@integra.com / security123  (Security Officer)
echo     tenant@integra.com   / tenant123    (Tenant)
echo     guest@integra.com    / guest123     (Hotel Guest)
echo.
pause
