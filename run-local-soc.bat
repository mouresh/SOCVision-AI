@echo off
title SOCVision AI Local SOC Mode Launcher
echo ===================================================
echo Launching SOCVision AI in Local SOC Mode
echo ===================================================

echo Starting local backend server in a new window...
start cmd /k "start-backend.bat"

echo Starting local frontend server in a new window...
start cmd /k "cd frontend && npm.cmd run dev"

echo ===================================================
echo Both services launched! 
echo Access the dashboard over HTTP in your browser at:
echo http://localhost:5173
echo ===================================================
pause
