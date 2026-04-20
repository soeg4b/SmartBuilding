@echo off
echo Stopping Smart Building Dashboard...
taskkill /F /FI "WINDOWTITLE eq API Server*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq Web App*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq Mobile App*" /T 2>nul
echo Servers stopped.
