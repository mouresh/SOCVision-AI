@echo off
title SOCVision AI Local Backend Runner
echo ===================================================
echo Starting SOCVision AI Local Backend Server
echo Target Host: http://192.168.1.12:8080
echo ===================================================
cd backend
set HOST=0.0.0.0
set PORT=8080
set SPLUNK_SIMULATION_MODE=false
node dist/server.js
pause
