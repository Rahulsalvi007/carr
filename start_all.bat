@echo off
echo =================================================================
echo   Starting RoadGuard AI (Backend + Frontend)
echo =================================================================

start "RoadGuard AI - Backend API" cmd /k ".\.venv\Scripts\python.exe backend/run.py"
start "RoadGuard AI - Frontend UI" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting up:
echo - Backend API:  http://localhost:8000 (Swagger docs: http://localhost:8000/docs)
echo - Frontend Web: https://localhost:5173 (HTTPS required for camera/mobile scanner)
echo.
echo NOTE: Mobile phone scanner link: https://<your-ip>:5173/?tab=mobile-cam
echo =================================================================
pause
