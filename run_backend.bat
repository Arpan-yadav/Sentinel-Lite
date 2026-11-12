@echo off
title SentinelLite Backend Server (FastAPI)
cd /d "%~dp0"
echo ========================================================
echo   Starting SentinelLite Backend on http://127.0.0.1:8000
echo ========================================================
set SQLITE_OVERRIDE=./sentinel_local.db
set DATABASE_URL=postgresql+asyncpg://x:x@localhost/x
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload
pause
