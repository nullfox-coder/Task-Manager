@echo off
echo Starting Task Manager Microservices...

REM Create logs directories if they don't exist
mkdir api-gateway\logs 2>nul
mkdir src\logs 2>nul

REM Make sure the existing task service is not running
echo Checking for existing processes...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3001') DO (
  echo Stopping process on port 3001: %%T
  taskkill /F /PID %%T 2>nul
)

REM Start API Gateway first
echo Starting API Gateway...
start "API Gateway" cmd /k "cd api-gateway && npm install && node server.js"

REM Wait for API Gateway to start
echo Waiting for API Gateway to initialize...
timeout /t 5 /nobreak

REM Start Task Service
echo Starting Task Service...
start "Task Service" cmd /k "cd src && node server.js"

echo Services are starting. Check the terminal windows for progress.
echo API Gateway: http://localhost:3000
echo Task Service: http://localhost:3001

echo.
echo Press any key to exit this window...
pause > nul 