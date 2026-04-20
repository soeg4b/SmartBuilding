@echo off
setlocal EnableDelayedExpansion
title Smart Building Dashboard — Create Portable Package
color 0B

echo.
echo  ================================================================
echo    SMART BUILDING DASHBOARD  ^|  Create Portable Package
echo    Packages the app (without node_modules) for sharing.
echo    Recipient only needs Node.js 18+ installed.
echo  ================================================================
echo.

:: ----------------------------------------------------------------
::  Locate app root
:: ----------------------------------------------------------------
set "APP_ROOT="

if exist "%~dp0package.json" (
    set "APP_ROOT=%~dp0"
    set "APP_ROOT=!APP_ROOT:~0,-1!"
    goto :root_found
)

for %%D in ("%~dp0..") do set "PARENT=%%~fD"
set "SIBLING=!PARENT!\20260414_Smart_Building_Dashboard"
if exist "!SIBLING!\package.json" (
    set "APP_ROOT=!SIBLING!"
    goto :root_found
)

echo  [ERROR] App source not found. Run this from the setup-ready folder.
pause
exit /b 1

:root_found
echo  App root : %APP_ROOT%

:: ----------------------------------------------------------------
::  Output path — Desktop
:: ----------------------------------------------------------------
set "ZIP_NAME=SmartBuildingDashboard-portable.zip"
set "ZIP_OUT=%USERPROFILE%\Desktop\%ZIP_NAME%"
echo  Output   : %ZIP_OUT%
echo.

if exist "%ZIP_OUT%" (
    echo  Existing file will be overwritten.
    echo.
)

:: ----------------------------------------------------------------
::  Run PowerShell to copy + zip (exclude node_modules, .next, logs)
:: ----------------------------------------------------------------
echo  Copying files and creating zip...
echo  (This may take a moment — excluding node_modules and .next)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$src = '%APP_ROOT%'; $out = '%ZIP_OUT%'; $launcherSrc = '%~dp0';" ^
  "if (Test-Path $out) { Remove-Item $out -Force }" ^
  "$tmp = Join-Path $env:TEMP 'sbd_portable_pack'; if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }" ^
  "New-Item -ItemType Directory $tmp | Out-Null;" ^
  "$appDest = Join-Path $tmp '20260414_Smart_Building_Dashboard';" ^
  "New-Item -ItemType Directory $appDest | Out-Null;" ^
  "$exclude = @('node_modules','.next','.git','*.log','backend.log','frontend.log','backend-error.log','frontend-error.log','package-lock.json');" ^
  "Get-ChildItem -Path $src -Recurse | Where-Object { $rel = $_.FullName.Substring($src.Length+1); $parts = $rel -split '\\\\'; $skip = $false; foreach ($ex in $exclude) { if ($parts -contains $ex -or $_ -like ('*\' + $ex)) { $skip = $true; break } }; -not $skip } | ForEach-Object { if (-not $_.PSIsContainer) { $rel = $_.FullName.Substring($src.Length+1); $dest = Join-Path $appDest $rel; $destDir = Split-Path $dest; if (-not (Test-Path $destDir)) { New-Item -ItemType Directory $destDir -Force | Out-Null }; Copy-Item $_.FullName $dest -Force } };" ^
  "$setupSrc = $launcherSrc.TrimEnd('\\'); $setupDest = Join-Path $tmp '20260414_Smart_Building_Dashboard (setup ready)';" ^
  "New-Item -ItemType Directory $setupDest | Out-Null;" ^
  "Get-ChildItem -Path $setupSrc | ForEach-Object { Copy-Item $_.FullName $setupDest -Force };" ^
  "Add-Type -AssemblyName System.IO.Compression.FileSystem;" ^
  "[System.IO.Compression.ZipFile]::CreateFromDirectory($tmp, $out, 'Optimal', $false);" ^
  "Remove-Item $tmp -Recurse -Force;" ^
  "Write-Host '  Done.'"

if errorlevel 1 (
    color 0C
    echo.
    echo  [ERROR] Packaging failed. See output above.
    pause
    exit /b 1
)

echo.
color 0A
echo  ================================================================
echo    Package created successfully!
echo.
echo    Location: %ZIP_OUT%
echo.
echo    HOW TO USE ON ANOTHER DEVICE:
echo      1. Copy %ZIP_NAME% to the target machine
echo      2. Unzip the file
echo      3. Make sure Node.js 18+ is installed  ^(nodejs.org^)
echo      4. Open the unzipped folder
echo      5. Double-click  LAUNCH.cmd  inside the setup-ready folder
echo.
echo    That's it — first launch will auto-install and build.
echo  ================================================================
echo.
pause
endlocal
