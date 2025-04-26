# API Gateway

This service acts as the entry point for all client requests in the Task Manager microservices architecture. It provides authentication, routing, service discovery, and load balancing capabilities.

## Features

- Authentication and authorization
- Request rate limiting
- Service discovery and health checks
- Load balancing across service instances
- API routing and proxying
- Robust error handling and logging

## Setup

1. Create a `.env` file from the `.env.example` template:
   ```
   cp .env.example .env
   ```

2. Modify the `.env` file with your specific configuration if necessary.

3. Install dependencies:
   ```
   npm install
   ```

4. Start the server:
   ```
   npm start
   ```
   
   For development with auto-reload:
   ```
   npm run dev
   ```
   
   Or use the provided script:
   ```
   bash start.sh
   ```

## Endpoints

### Authentication
- `POST /api/users/login` - Login with username and password
- `POST /api/users/logout` - Logout user

### Service Management
- `GET /api/services` - List all registered services
- `GET /api/services/:name/health` - Check health of a specific service

### Health Check
- `GET /health` - API Gateway health check

### Task Service (Proxied)
- `GET /api/tasks` - Get all tasks (authenticated)
- `POST /api/tasks` - Create a new task (authenticated)
- `GET /api/tasks/:id` - Get a specific task (authenticated)
- `PUT /api/tasks/:id` - Update a task (authenticated)
- `DELETE /api/tasks/:id` - Delete a task (authenticated)

## Development

For local development, ensure that:

1. The Task Service is running on the port specified in your `.env` file
2. You have the correct JWT_SECRET set for authentication

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| GATEWAY_PORT | The port for the API Gateway | 3000 |
| CLIENT_URL | Allowed origin for CORS | http://localhost:3000 |
| JWT_SECRET | Secret key for JWT authentication | |
| TASK_SERVICE_URL | URL of the Task Service | http://localhost:3001 |
| LOAD_BALANCER_STRATEGY | Strategy for load balancing (round-robin, random) | round-robin |
| HEALTH_CHECK_INTERVAL | Interval for service health checks (ms) | 30000 |
| LOG_LEVEL | Logging level | info |
| LOG_DIR | Directory to store logs | logs |
| NODE_ENV | Node environment | development | 