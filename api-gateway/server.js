require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const { loginLimiter, apiLimiter } = require('./middleware/rate-limiter');
const authenticate = require('./middleware/auth');
const requestLogger = require('./middleware/request-logger');
const serviceDiscovery = require('./services/service-discovery');
const loadBalancer = require('./services/load-balancer');

const app = express();

// Create logs directory if it doesn't exist
const logDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

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

// Register services - use port 3002 since 3001 is in use
serviceDiscovery.registerService('task-service', process.env.TASK_SERVICE_URL || 'http://localhost:3001');
serviceDiscovery.startHealthChecks();

// Add service registration endpoint for services to self-register
app.post('/api/services/register', (req, res) => {
  try {
    const { name, url } = req.body;
    
    console.log('Service registration request received:', req.body);
    
    if (!name || !url) {
      console.error('Service registration failed: Missing name or URL');
      return res.status(400).json({ 
        message: 'Service name and URL are required',
        received: req.body
      });
    }
    
    serviceDiscovery.registerService(name, url);
    console.log(`Service ${name} registered at ${url}`);
    res.status(201).json({ message: `Service ${name} registered successfully` });
  } catch (error) {
    console.error('Service registration error:', error);
    res.status(500).json({ message: 'Failed to register service', error: error.message });
  }
});

// Add health check update endpoint
app.post('/api/services/health/:name', (req, res) => {
  try {
    const { name } = req.params;
    const { status } = req.body;
    
    console.log(`Health update received for ${name}: ${status}`);
    
    const service = serviceDiscovery.getService(name);
    if (!service) {
      return res.status(404).json({ message: `Service ${name} not found` });
    }
    
    service.isHealthy = status === 'healthy';
    service.lastHealthCheck = Date.now();
    
    res.status(200).json({ message: `Health update for ${name} received` });
  } catch (error) {
    console.error('Health update error:', error);
    res.status(500).json({ message: 'Failed to update health status', error: error.message });
  }
});

// Simple user auth routes (placeholder until integrated with src)
app.post('/api/users/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  
  // Simple validation for demo purposes
  if (username === 'admin' && password === 'password') {
    const token = require('jsonwebtoken').sign(
      { userId: 1, username: 'admin' },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '1h' }
    );
    
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      secure: process.env.NODE_ENV === 'production'
    });
    
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/api/users/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

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
