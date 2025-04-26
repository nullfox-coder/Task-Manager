/**
 * Task Service Entry Server
 * Handles requests for task management functionality
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { logger } = require('./utils/logger');
const { getServerPort } = require('./scripts/server-port');
const { registerService } = require('./utils/service-registration');

// Only import these after dotenv has loaded
const { initDatabase } = require('./scripts/init-db');
const db = require('./models');

// Create Express server
const app = express();
let PORT = process.env.PORT || 3001; // Will be updated by getServerPort()

// Create logs directory if it doesn't exist
const logDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Setup request logging
const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'), 
  { flags: 'a' }
);

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(compression()); // Compress responses
app.use(morgan('combined', { stream: accessLogStream })); // HTTP request logging

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    
    res.status(200).json({
      status: 'UP',
      service: 'task-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'DOWN',
      service: 'task-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database connection failed'
    });
  }
});

// Load routes
const loadRoutes = () => {
  try {
    // API routes - load dynamically if possible
    const routesPath = path.join(__dirname, 'api', 'routes');
    if (fs.existsSync(routesPath)) {
      fs.readdirSync(routesPath).forEach(file => {
        if (file.endsWith('.js')) {
          const routeName = file.split('.')[0];
          const route = require(path.join(routesPath, file));
          app.use(`/${routeName}`, route);
          logger.info(`Route loaded: /${routeName}`);
        }
      });
    } else {
      // Fallback to hardcoded routes
      const taskRoutes = require('./api/routes/task.routes');
      app.use('/tasks', taskRoutes);
      logger.info('Route loaded: /tasks');
    }
  } catch (error) {
    logger.error('Error loading routes:', error);
    throw error;
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Find available port (handles port conflicts)
    PORT = await getServerPort();
    
    // Initialize database
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      logger.error('Failed to initialize database, starting server anyway...');
    } else {
      logger.info('Database initialized successfully');
    }
    
    // Load routes
    loadRoutes();
    
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Task service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Register with service discovery
      const serviceInfo = {
        name: 'task-service',
        host: process.env.SERVICE_HOST || 'localhost',
        port: PORT
      };
      
      registerService(serviceInfo);
      
      // Log routes (for debugging)
      if (process.env.NODE_ENV === 'development') {
        app._router.stack.forEach((middleware) => {
          if (middleware.route) {
            logger.info(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
          }
        });
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        
        // Close database connections
        db.sequelize.close().then(() => {
          logger.info('Database connections closed');
        }).catch(err => {
          logger.error('Error closing database connections:', err);
        });
      });
    });
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Export for testing purposes
module.exports = { app, startServer };

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}
