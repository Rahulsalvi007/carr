@echo off
echo ==================================================
echo   RoadGuard AI - Traffic Detection System
echo ==================================================
echo.

:: Start Backend
echo [1/2] Starting Backend (FastAPI on port 8000)...
start "RoadGuard Backend" cmd /k ".venv\Scripts\python.exe backend\run.py"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend
echo [2/2] Starting Frontend (React on port 5173)...
start "RoadGuard Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==================================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo ==================================================
echo.
echo Both servers are starting in separate windows.
echo Close those windows to stop the servers.
pause
