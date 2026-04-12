@echo off
title AIR TOWER
color 0A
echo.
echo  ========================================
echo   AIR TOWER — Starting
echo  ========================================
echo.
echo  Stopping old Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo  Starting backend (port 5000)...
start "AIR TOWER - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 4 /nobreak >nul
echo  Starting frontend (port 3000)...
start "AIR TOWER - Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"
echo.
echo  Backend:   http://localhost:5000
echo  Frontend:  http://localhost:3000
echo.
echo  MULTI-USER: Open http://localhost:3000 in TWO Chrome profiles
echo  First time: go to /setup to create admin account
echo.
pause
