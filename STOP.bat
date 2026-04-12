@echo off
echo Stopping all Node processes...
taskkill /F /IM node.exe >nul 2>&1
echo Done. All AIR TOWER processes stopped.
pause
