#!/bin/bash
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo "---"

# Check if we're in the right directory
if [ -d "frontend" ]; then
    echo "Frontend directory found"
    cd frontend
    npm install
    npm run build
else
    echo "ERROR: Frontend directory not found!"
    echo "Looking for frontend in parent directories..."
    
    # Try to find frontend directory
    if [ -d "../frontend" ]; then
        echo "Found frontend in parent directory"
        cd ../frontend
        npm install
        npm run build
    elif [ -d "../../frontend" ]; then
        echo "Found frontend two levels up"
        cd ../../frontend
        npm install
        npm run build
    else
        echo "ERROR: Cannot locate frontend directory"
        exit 1
    fi
fi