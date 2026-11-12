@echo off
title SentinelLite AI-SOC Launcher
cd /d "%~dp0"
echo ========================================================
echo   Launching SentinelLite AI-SOC Platform...
echo ========================================================
start "SentinelLite Backend" cmd /c "run_backend.bat"
timeout /t 3 /nobreak >nul
start "SentinelLite Frontend" cmd /c "run_frontend.bat"
timeout /t 2 /nobreak >nul
echo.
echo SentinelLite is starting up!
echo   - Backend:  http://127.0.0.1:8000
echo   - Frontend: http://localhost:3000
echo.
echo Login Credentials:
echo   - Admin:   admin@sentinellite.io   / AdminPass123!
echo   - Analyst: analyst@sentinellite.io / AnalystPass123!
echo.
start http://localhost:3000
