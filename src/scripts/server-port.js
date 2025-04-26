/**
 * Server Port Utility
 * Automatically finds an available port if the default port is in use.
 */
const net = require('net');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

/**
 * Checks if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - True if port is available, false otherwise
 */
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // Other error occurred, assume port is not available
        logger.warn(`Error checking port ${port}: ${err.message}`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
};

/**
 * Finds an available port, starting from the provided port
 * @param {number} startPort - Port to start checking from
 * @returns {Promise<number>} - Available port
 */
const findAvailablePort = async (startPort) => {
  let port = startPort;
  let maxAttempts = 10; // Try up to 10 ports
  
  while (maxAttempts > 0) {
    const available = await isPortAvailable(port);
    
    if (available) {
      return port;
    }
    
    logger.info(`Port ${port} is in use, trying ${port + 1}`);
    port++;
    maxAttempts--;
  }
  
  logger.warn(`Could not find available port after ${10 - maxAttempts} attempts`);
  return startPort; // Return original port as fallback
};

/**
 * Gets a server port - either from env or finds an available one
 * @returns {Promise<number>} - The port to use
 */
const getServerPort = async () => {
  const defaultPort = parseInt(process.env.PORT || '3001', 10);
  
  // Check if default port is available
  const available = await isPortAvailable(defaultPort);
  
  if (available) {
    logger.info(`Default port ${defaultPort} is available`);
    return defaultPort;
  }
  
  // Find an available port
  logger.warn(`Default port ${defaultPort} is in use, searching for available port`);
  const port = await findAvailablePort(defaultPort + 1);
  
  logger.info(`Using port ${port} for the server`);
  return port;
};

// Export for use in other files
module.exports = { getServerPort, findAvailablePort };

// If run directly
if (require.main === module) {
  getServerPort()
    .then(port => {
      console.log(`Server should use port: ${port}`);
      process.exit(0);
    })
    .catch(err => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
} 