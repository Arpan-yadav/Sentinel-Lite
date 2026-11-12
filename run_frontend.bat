@echo off
title SentinelLite SOC Dashboard (Next.js)
cd /d "%~dp0frontend"
echo ========================================================
echo   Starting SentinelLite Frontend on http://localhost:3000
echo ========================================================
pnpm dev --port 3000
pause
