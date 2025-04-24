const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const { loginLimiter, apiLimiter } = require('./middleware/rate-limiter');
const authenticate = require('./middleware/auth');
const requestLogger = require('./middleware/request-logger');
const userRoutes = require('../src/api/routes/user.routes');
const serviceDiscovery = require('./services/service-discovery');
const loadBalancer = require('./services/load-balancer');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Basic middleware
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

// Register services
serviceDiscovery.registerService('task-service', process.env.TASK_SERVICE_URL || 'http://localhost:3001');
serviceDiscovery.startHealthChecks();

// Public routes (no authentication required)
app.use('/api/users', loginLimiter, userRoutes);

// Protected routes with load balancing
app.use('/api/tasks', authenticate, apiLimiter, async (req, res) => {
  await loadBalancer.proxyRequest(req, res, 'task-service', req.path.replace('/api', ''));
});

// Service discovery endpoints
app.get('/api/services', (req, res) => {
  res.json(serviceDiscovery.getAllServices());
});

app.get('/api/services/:name/health', async (req, res) => {
  const isHealthy = await serviceDiscovery.checkServiceHealth(req.params.name);
  res.json({ isHealthy });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    services: serviceDiscovery.getAllServices().map(([name, service]) => ({
      name,
      isHealthy: service.isHealthy,
      lastHealthCheck: service.lastHealthCheck
    }))
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.GATEWAY_PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
