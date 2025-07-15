# Backend Server Management Guide

## The Problem
On Windows, Node.js processes sometimes don't terminate properly when you press Ctrl+C, leaving the port (3001) occupied. This prevents you from restarting the server.

## Solutions

### Method 1: Use the Batch Scripts (Recommended)
We've created helper scripts in the backend folder:

1. **To stop the server:**
   ```bash
   # Double-click or run:
   stop-server.bat
   ```

2. **To start the server:**
   ```bash
   # Double-click or run:
   start-server.bat
   ```

### Method 2: Use npm/pnpm scripts
From the backend directory:

```bash
# Stop all Node.js processes (careful - this stops ALL node processes)
npm run stop

# Stop only the process on port 3001
npm run stop:port

# Then start normally
npm run dev
```

### Method 3: PowerShell Script
If you prefer PowerShell:

```powershell
# Run the PowerShell script
./stop-server.ps1
```

Note: You may need to enable script execution first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Method 4: Manual Process Kill
If all else fails, manually find and kill the process:

```bash
# Find the process ID
netstat -ano | findstr :3001

# Look for the PID in the LISTENING line, then kill it
taskkill /F /PID [PID_NUMBER]
```

## Prevention Tips

1. **Always use the stop scripts** before closing your terminal
2. **Wait for the "Server stopped" message** before closing the terminal
3. **Use the graceful shutdown** - the server now listens for SIGINT/SIGTERM signals

## Quick Commands Reference

```bash
# From the backend directory:
cd preciously.ai/backend

# Start server
npm run dev

# Stop server (from another terminal)
npm run stop:port

# Or use the batch file (can double-click from Windows Explorer)
stop-server.bat
```

## Why This Happens

Windows handles process signals differently than Unix systems. When you press Ctrl+C, Windows doesn't always send the proper termination signal to Node.js, especially when using certain terminal emulators or when the process has child processes.