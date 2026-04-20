@echo off
setlocal EnableDelayedExpansion
title Smart Building Dashboard — Launching...
color 0A

echo.
echo  ================================================================
echo    SMART BUILDING DASHBOARD  ^|  One-Click Setup ^& Launch
echo  ================================================================
echo.

:: ================================================================
::  STEP 0 — Locate the application source root
::  Supports two layouts:
::    A) This file is inside the app folder  (self-contained copy)
::    B) This file is in a sibling folder    (dev/original machine)
:: ================================================================

set "APP_ROOT="

:: Layout A — package.json is in our own directory
if exist "%~dp0package.json" (
    set "APP_ROOT=%~dp0"
    set "APP_ROOT=!APP_ROOT:~0,-1!"
    echo  [LOCATE] Using app source: !APP_ROOT!
    goto :app_found
)

:: Layout B — sibling directory named 20260414_Smart_Building_Dashboard
for %%D in ("%~dp0..") do set "PARENT=%%~fD"
set "SIBLING=!PARENT!\20260414_Smart_Building_Dashboard"
if exist "!SIBLING!\package.json" (
    set "APP_ROOT=!SIBLING!"
    echo  [LOCATE] Using app source: !APP_ROOT!
    goto :app_found
)

:: Not found
color 0C
echo  [ERROR] Cannot find the Smart Building Dashboard source files.
echo.
echo  Please do ONE of the following:
echo.
echo    Option 1  ^(Other Device^)
echo      Copy the entire '20260414_Smart_Building_Dashboard' folder
echo      alongside this 'setup ready' folder, then run LAUNCH.cmd again.
echo.
echo    Option 2  ^(Self-Contained^)
echo      Copy the contents of '20260414_Smart_Building_Dashboard' INTO
echo      this folder so package.json is next to LAUNCH.cmd.
echo.
pause
exit /b 1

:app_found
echo.

:: ================================================================
::  STEP 1 — Check Node.js (18+)
:: ================================================================
echo  [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERROR] Node.js is NOT installed.
    echo.
    echo  Download Node.js 18+ from:  https://nodejs.org/en/download
    echo.
    choice /c YN /m "  Open the download page now?"
    if not errorlevel 2 start "" "https://nodejs.org/en/download"
    echo.
    echo  After installing Node.js, close this window and run LAUNCH.cmd again.
    pause
    exit /b 1
)

for /f %%V in ('node -e "process.stdout.write(process.version)"') do set "NODE_VER=%%V"
echo  [OK] Node.js %NODE_VER% found.
echo.

:: ================================================================
::  STEP 2 — Install npm dependencies (first run only)
:: ================================================================
echo  [2/4] Checking npm dependencies...

if not exist "%APP_ROOT%\node_modules" (
    echo  [INSTALL] node_modules not found — running npm install (2-3 min)...
    echo  (Tip: run BUNDLE-DEPS.cmd once to embed deps for offline use)
    echo.
    pushd "%APP_ROOT%"
    call npm install
    if errorlevel 1 (
        color 0C
        echo.
        echo  [ERROR] npm install failed. Check your internet connection.
        popd
        pause
        exit /b 1
    )
    popd
    echo.
    echo  [OK] Packages installed.
) else (
    echo  [OK] Dependencies present — skipping install.
)
echo.

:: ================================================================
::  STEP 3 — Build Next.js frontend (first run only)
:: ================================================================
echo  [3/4] Checking frontend build...

if not exist "%APP_ROOT%\src\frontend\.next\BUILD_ID" (
    echo  [BUILD] No pre-built frontend found — building now (1-2 min)...
    echo  (Tip: run BUNDLE-DEPS.cmd to embed the build for instant launch)
    echo.
    pushd "%APP_ROOT%\src\frontend"

    :: Ensure frontend deps are installed
    if not exist "node_modules" (
        call npm install >nul 2>&1
    )

    :: Build
    call npx next build
    if errorlevel 1 (
        color 0C
        echo.
        echo  [ERROR] Frontend build failed.
        echo  Check the output above for details.
        popd
        pause
        exit /b 1
    )
    popd
    echo.
    echo  [OK] Frontend built successfully.
) else (
    echo  [OK] Pre-built frontend present — skipping build.
)
echo.

:: ================================================================
::  STEP 4 — Stop any previous instances on ports 5000/5001
:: ================================================================
echo  [4/4] Starting services...
echo.
echo  Clearing ports 5000 and 5001 from previous runs...

for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%P >nul 2>&1
)
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":5001 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%P >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: ----------------------------------------------------------------
::  Write temp launchers to avoid path-with-spaces issues
:: ----------------------------------------------------------------
set "TMP_BACKEND=%TEMP%\sbd_backend_run.cmd"
set "TMP_FRONTEND=%TEMP%\sbd_frontend_run.cmd"

(
    echo @echo off
    echo title SBD — Backend API ^(port 5000^)
    echo cd /d "%APP_ROOT%"
    echo echo  Backend API starting on http://localhost:5000
    echo echo  Press Ctrl+C to stop.
    echo node demo-server.mjs
    echo pause
) > "%TMP_BACKEND%"

(
    echo @echo off
    echo title SBD — Web Dashboard ^(port 5001^)
    echo cd /d "%APP_ROOT%\src\frontend"
    echo echo  Web Dashboard starting on http://localhost:5001
    echo echo  Press Ctrl+C to stop.
    echo npx next start -p 5001
    echo pause
) > "%TMP_FRONTEND%"

:: ----------------------------------------------------------------
::  Launch services in background windows
:: ----------------------------------------------------------------
echo  Starting Backend API ...
start "SBD — Backend API" /min "%TMP_BACKEND%"

echo  Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo  Starting Web Dashboard...
start "SBD — Web Dashboard" /min "%TMP_FRONTEND%"

echo.
echo  Waiting for services to become ready...
timeout /t 8 /nobreak >nul

:: Open browser
echo  Opening browser...
start "" "http://localhost:5001"

:: ================================================================
::  Done
:: ================================================================
color 0A
echo.
echo  ================================================================
echo    ALL SERVICES ARE LIVE
echo.
echo    Web Dashboard  →  http://localhost:5001
echo    API Health     →  http://localhost:5000/api/v1/health
echo.
echo    LOGIN ACCOUNTS
echo    admin@smartbuilding.com  /  admin123   (System Admin)
echo    cfo@smartbuilding.com    /  cfo123     (CFO / Executive)
echo    tech@smartbuilding.com   /  tech123    (Technician)
echo.
echo    To stop all services, run STOP.cmd
echo  ================================================================
echo.
echo  This window can be safely closed.
echo  Services will continue running until you run STOP.cmd.
echo.
pause >nul
endlocal
