#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if .env file exists, otherwise use .env.example
if [ ! -f .env ]; then
  echo "No .env file found, creating one from .env.example..."
  cp .env.example .env 2>/dev/null || echo "No .env.example found either, please create a .env file manually"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the API Gateway in development mode
echo "Starting API Gateway..."
npm run dev 