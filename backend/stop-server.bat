@echo off
echo Stopping server on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /F /PID %%a
)
echo Server stopped.
pause