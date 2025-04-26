#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Task Manager Microservices...${NC}\n"

# Create logs directories if they don't exist
mkdir -p api-gateway/logs
mkdir -p src/logs

# Kill any existing processes on ports 3000 and 3002
echo -e "${BLUE}Stopping any existing processes...${NC}"
kill $(lsof -t -i:3000) 2>/dev/null || true
kill $(lsof -t -i:3002) 2>/dev/null || true

# Make scripts executable
chmod +x api-gateway/start.sh 2>/dev/null || true
chmod +x src/start.sh 2>/dev/null || true

# Start API Gateway first in a new terminal if possible
echo -e "${GREEN}Starting API Gateway...${NC}"
cd api-gateway

# Try different terminal launching methods
if command -v gnome-terminal &> /dev/null; then
  gnome-terminal -- bash -c "npm install && node server.js; exec bash" &
elif command -v xterm &> /dev/null; then
  xterm -e "npm install && node server.js; exec bash" &
elif command -v open &> /dev/null && [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  osascript -e 'tell app "Terminal" to do script "cd '$PWD' && npm install && node server.js"'
else
  # Fallback: run in background
  npm install && node server.js > logs/api-gateway.log 2>&1 &
  echo -e "${BLUE}API Gateway running in background. Check logs/api-gateway.log for output${NC}"
fi

# Wait for API Gateway to start
echo -e "${BLUE}Waiting for API Gateway to initialize...${NC}"
sleep 5

# Go back to the project root
cd ..

# Start Task Service in a new terminal if possible
echo -e "${GREEN}Starting Task Service...${NC}"
cd src

# Try different terminal launching methods
if command -v gnome-terminal &> /dev/null; then
  gnome-terminal -- bash -c "node server.js; exec bash" &
elif command -v xterm &> /dev/null; then
  xterm -e "node server.js; exec bash" &
elif command -v open &> /dev/null && [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  osascript -e 'tell app "Terminal" to do script "cd '$PWD' && node server.js"'
else
  # Fallback: run in background
  node server.js > logs/task-service.log 2>&1 &
  echo -e "${BLUE}Task Service running in background. Check logs/task-service.log for output${NC}"
fi

# Go back to the project root
cd ..

echo -e "\n${GREEN}Services are starting. Check the terminal windows for progress.${NC}"
echo -e "API Gateway: http://localhost:3000"
echo -e "Task Service: http://localhost:3002" 