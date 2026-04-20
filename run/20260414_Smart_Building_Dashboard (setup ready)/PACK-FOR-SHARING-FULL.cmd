@echo off
setlocal EnableDelayedExpansion
title Smart Building Dashboard — Create Full Offline ZIP
color 0B

echo.
echo  ================================================================
echo    SMART BUILDING DASHBOARD  ^|  Pack Full Offline ZIP
echo    Creates a ZIP containing ALL dependencies + pre-built app.
echo    Target device only needs Node.js 18+. No internet required.
echo  ================================================================
echo.

:: ----------------------------------------------------------------
::  Verify BUNDLE-DEPS.cmd was run first (package.json exists here)
:: ----------------------------------------------------------------
set "SELF=%~dp0"
set "SELF=!SELF:~0,-1!"

if not exist "!SELF!\package.json" (
    color 0E
    echo  [STEP REQUIRED] This folder is not yet bundled.
    echo.
    echo  Run  BUNDLE-DEPS.cmd  first to copy the app and all
    echo  dependencies into this folder, then run this script again.
    echo.
    choice /c YN /m "  Run BUNDLE-DEPS.cmd now?"
    if not errorlevel 2 (
        call "!SELF!\BUNDLE-DEPS.cmd"
        if errorlevel 1 (
            echo  Bundling failed. Exiting.
            pause
            exit /b 1
        )
    ) else (
        pause
        exit /b 1
    )
)

if not exist "!SELF!\node_modules" (
    color 0E
    echo  [WARNING] node_modules not found in this folder.
    echo  Run BUNDLE-DEPS.cmd first for a fully offline package.
    echo.
    choice /c YN /m "  Continue and pack without node_modules?"
    if errorlevel 2 (
        pause
        exit /b 1
    )
)

:: ----------------------------------------------------------------
::  Output ZIP path
:: ----------------------------------------------------------------
set "ZIP_NAME=SmartBuildingDashboard-FULL-offline.zip"
set "ZIP_OUT=%USERPROFILE%\Desktop\%ZIP_NAME%"

echo  Output   : %ZIP_OUT%
echo.

if exist "%ZIP_OUT%" (
    echo  Existing file will be replaced.
    echo.
)

:: ----------------------------------------------------------------
::  Estimate size warning
:: ----------------------------------------------------------------
echo  NOTE: This ZIP includes node_modules and can be 300-800 MB.
echo  For a smaller ZIP (internet required on target), use
echo  PACK-FOR-SHARING.cmd instead.
echo.
choice /c YN /m "  Continue?"
if errorlevel 2 (
    echo  Cancelled.
    pause
    exit /b 0
)
echo.

:: ----------------------------------------------------------------
::  Create ZIP via PowerShell
:: ----------------------------------------------------------------
echo  Creating ZIP archive (this may take several minutes)...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$src = '%SELF%'; $out = '%ZIP_OUT%';" ^
  "if (Test-Path $out) { Remove-Item $out -Force }" ^
  "$tmp = Join-Path $env:TEMP 'sbd_full_pack';" ^
  "if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }" ^
  "New-Item -ItemType Directory $tmp | Out-Null;" ^
  "$dest = Join-Path $tmp 'SmartBuildingDashboard (setup ready)';" ^
  "New-Item -ItemType Directory $dest | Out-Null;" ^
  "$exclude = @('.git','*.log');" ^
  "Get-ChildItem -Path $src -Recurse | Where-Object { if ($_.PSIsContainer) { return $false }; $rel = $_.FullName.Substring($src.Length+1); $parts = $rel -split '\\\\'; $skip = $false; foreach ($ex in $exclude) { if ($parts -contains $ex -or ($_ -like ('*' + $ex))) { $skip = $true; break } }; -not $skip } | ForEach-Object { $rel = $_.FullName.Substring($src.Length+1); $d = Join-Path $dest $rel; $dir = Split-Path $d; if (-not (Test-Path $dir)) { New-Item -ItemType Directory $dir -Force | Out-Null }; Copy-Item $_.FullName $d -Force };" ^
  "Write-Host '  Compressing...';" ^
  "Add-Type -AssemblyName System.IO.Compression.FileSystem;" ^
  "[System.IO.Compression.ZipFile]::CreateFromDirectory($tmp, $out, 'Optimal', $false);" ^
  "Remove-Item $tmp -Recurse -Force;" ^
  "Write-Host '  Done.'"

if errorlevel 1 (
    color 0C
    echo.
    echo  [ERROR] Packing failed. See output above.
    pause
    exit /b 1
)

:: Get file size
for %%F in ("%ZIP_OUT%") do set "ZIP_MB=%%~zF"
set /a ZIP_MB=ZIP_MB/1048576

color 0A
echo.
echo  ================================================================
echo    ZIP created successfully!
echo.
echo    Location : %ZIP_OUT%
echo    Size     : ~%ZIP_MB% MB
echo.
echo    HOW TO USE ON ANOTHER DEVICE:
echo      1. Copy %ZIP_NAME% to target machine
echo      2. Install Node.js 18+  (nodejs.org)  if not already
echo      3. Unzip the file
echo      4. Open  SmartBuildingDashboard (setup ready)  folder
echo      5. Double-click  LAUNCH.cmd
echo.
echo    No internet connection needed — all dependencies included.
echo  ================================================================
echo.
pause
endlocal
