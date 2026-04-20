@echo off
setlocal EnableDelayedExpansion
title Smart Building Dashboard — Bundle Dependencies
color 0B

echo.
echo  ================================================================
echo    SMART BUILDING DASHBOARD  ^|  Bundle All Dependencies
echo    Copies app source + node_modules + build into THIS folder.
echo    Result: fully self-contained — no internet needed on target.
echo  ================================================================
echo.

:: ----------------------------------------------------------------
::  Locate source app
:: ----------------------------------------------------------------
set "SRC="
set "SELF=%~dp0"
set "SELF=!SELF:~0,-1!"

:: Layout A — source is a sibling folder named 20260414_Smart_Building_Dashboard
for %%D in ("!SELF!\.." ) do set "PARENT=%%~fD"
set "SIBLING=!PARENT!\20260414_Smart_Building_Dashboard"
if exist "!SIBLING!\package.json" (
    set "SRC=!SIBLING!"
    goto :src_found
)

:: Layout B — already bundled (package.json sits next to this script)
if exist "!SELF!\package.json" (
    echo  [OK] Dependencies are already bundled in this folder.
    echo.
    echo  Nothing to do — this folder is already self-contained.
    echo  Run LAUNCH.cmd to start the application.
    echo.
    pause
    exit /b 0
)

color 0C
echo  [ERROR] Cannot find the source app folder.
echo.
echo  Expected location:  !SIBLING!
echo  Make sure '20260414_Smart_Building_Dashboard' folder is placed
echo  alongside this '20260414_Smart_Building_Dashboard (setup ready)' folder.
echo.
pause
exit /b 1

:src_found
echo  Source   : !SRC!
echo  Dest     : !SELF!
echo.

:: ----------------------------------------------------------------
::  Verify source has installed dependencies
:: ----------------------------------------------------------------
echo  Checking source readiness...
set "MISSING="

if not exist "!SRC!\node_modules" (
    set "MISSING=!MISSING! [root/node_modules]"
)
if not exist "!SRC!\src\backend\node_modules" (
    set "MISSING=!MISSING! [backend/node_modules]"
)
if not exist "!SRC!\src\frontend\.next\BUILD_ID" (
    set "MISSING=!MISSING! [frontend/.next build]"
)
if not exist "!SRC!\demo-server.mjs" (
    set "MISSING=!MISSING! [demo-server.mjs]"
)

if defined MISSING (
    color 0E
    echo.
    echo  [WARNING] Some expected files are missing in the source:
    echo    !MISSING!
    echo.
    echo  You may need to run 'npm install' and 'next build' in the source
    echo  folder first for a fully offline bundle.
    echo.
    choice /c YN /m "  Continue anyway?"
    if errorlevel 2 (
        echo  Cancelled.
        pause
        exit /b 1
    )
    echo.
)

:: ----------------------------------------------------------------
::  Robocopy — copy everything except .git
:: ----------------------------------------------------------------
echo  Copying files using robocopy...
echo  (This may take several minutes for node_modules — please wait)
echo.

robocopy "!SRC!" "!SELF!" ^
  /E ^
  /XD ".git" ^
  /XF "*.log" "backend.log" "frontend.log" "backend-error.log" "frontend-error.log" ^
  /NDL /NJH /NJS ^
  /NFL ^
  /MT:8

:: robocopy exit codes 0-7 are success/info (not errors)
if errorlevel 8 (
    color 0C
    echo.
    echo  [ERROR] Robocopy encountered errors (code %errorlevel%).
    echo  Some files may not have been copied. Check the output above.
    pause
    exit /b 1
)

:: ----------------------------------------------------------------
::  Done
:: ----------------------------------------------------------------
color 0A
echo.
echo  ================================================================
echo    BUNDLE COMPLETE  —  This folder is now fully self-contained.
echo.
echo    Included:
echo      - All source code
echo      - node_modules  (offline, no npm install needed)
echo      - Pre-built frontend  (.next, no build step needed)
echo      - Backend dist  (compiled TypeScript)
echo.
echo    TO DEPLOY ON ANOTHER DEVICE:
echo      1. Copy THIS entire folder to the target machine
echo      2. Ensure Node.js 18+ is installed  (nodejs.org)
echo      3. Double-click  LAUNCH.cmd
echo      4. Done — goes live in seconds (no npm, no build)
echo.
echo    OR use PACK-FOR-SHARING-FULL.cmd to create a ZIP of
echo    this folder ready to send/upload.
echo  ================================================================
echo.
pause
endlocal
