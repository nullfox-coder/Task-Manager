#!/bin/bash

# Load environment variables
if [ -f ../../.env ]; then
  export $(cat ../../.env | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

# Create necessary directories
mkdir -p ../../logs
mkdir -p ../../cache
mkdir -p ../../static
mkdir -p ../../ssl
mkdir -p ../../backup
mkdir -p ../../dashboards

# Generate SSL certificates if they don't exist
if [ ! -f ../../ssl/server.crt ] || [ ! -f ../../ssl/server.key ]; then
  echo "Generating SSL certificates..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ../../ssl/server.key \
    -out ../../ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Build and start services
echo "Building and starting services..."
docker-compose up --build -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 30

# Check SSL configuration
echo "Checking SSL configuration..."
curl -k -I https://localhost/health

# Check monitoring setup
echo "Checking Prometheus..."
curl -s http://localhost:9090/-/healthy

# Check Alertmanager
echo "Checking Alertmanager..."
curl -s http://localhost:9093/-/healthy

# Check Grafana
echo "Checking Grafana..."
curl -s http://localhost:3000/api/health

# Check service discovery
echo "Checking registered services..."
curl -s https://localhost/api/services | jq

# Check resource usage
echo "Checking resource usage..."
docker stats --no-stream

# Check backup
echo "Checking backup..."
docker exec $(docker ps -q -f name=backup) ls -l /backup

# Check alert rules
echo "Checking alert rules..."
curl -s http://localhost:9090/api/v1/rules | jq

echo "Deployment complete!"
echo "Nginx: https://localhost"
echo "API Gateway: http://localhost:3000"
echo "Task Service 1: http://localhost:3001"
echo "Task Service 2: http://localhost:3002"
echo "Prometheus: http://localhost:9090"
echo "Alertmanager: http://localhost:9093"
echo "Grafana: http://localhost:3000"

# Display logs
echo "Displaying logs (press Ctrl+C to exit)..."
docker-compose logs -f 