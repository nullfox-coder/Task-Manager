/**
 * Server Port Utility
 * Handles dynamic port allocation for services
 */
const fs = require('fs');
const path = require('path');
const { logger } = require('../src/utils/logger');

// Base port for the service
const BASE_PORT = parseInt(process.env.SERVICE_BASE_PORT || '3001', 10);

// Maximum number of instances allowed
const MAX_INSTANCES = parseInt(process.env.MAX_SERVICE_INSTANCES || '10', 10);

// Path to the port registry file
const PORT_REGISTRY_FILE = path.join(__dirname, '../.port-registry.json');

/**
 * Initialize the port registry file if it doesn't exist
 */
const initPortRegistry = () => {
  if (!fs.existsSync(PORT_REGISTRY_FILE)) {
    fs.writeFileSync(PORT_REGISTRY_FILE, JSON.stringify({
      nextPort: BASE_PORT,
      allocatedPorts: []
    }));
  }
};

/**
 * Get an available port for the server
 * @returns {number} Available port number
 */
const getServerPort = () => {
  // Check if port is explicitly defined in environment variables
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10);
  }
  
  // If port offset is specified in the environment
  if (process.env.PORT_OFFSET) {
    return BASE_PORT + parseInt(process.env.PORT_OFFSET, 10);
  }
  
  // Initialize port registry if needed
  initPortRegistry();
  
  try {
    // Read the current port registry
    const registry = JSON.parse(fs.readFileSync(PORT_REGISTRY_FILE, 'utf8'));
    
    // Get process ID for identification
    const pid = process.pid;
    
    // Check if this process already has a port allocated
    const existingPort = registry.allocatedPorts.find(p => p.pid === pid);
    if (existingPort) {
      logger.info(`Using previously allocated port: ${existingPort.port}`);
      return existingPort.port;
    }
    
    // Allocate a new port
    const port = registry.nextPort;
    
    // Update the registry
    registry.allocatedPorts.push({
      pid,
      port,
      allocated: new Date().toISOString()
    });
    
    // Increment the next port, or reset to base if we've reached max
    registry.nextPort = port + 1;
    if (registry.nextPort > BASE_PORT + MAX_INSTANCES - 1) {
      registry.nextPort = BASE_PORT;
    }
    
    // Save the updated registry
    fs.writeFileSync(PORT_REGISTRY_FILE, JSON.stringify(registry, null, 2));
    
    logger.info(`Allocated new port: ${port}`);
    
    // Register cleanup on process exit to release the port
    process.on('exit', () => releasePort(pid));
    process.on('SIGINT', () => {
      releasePort(pid);
      process.exit();
    });
    
    return port;
  } catch (error) {
    logger.error(`Error allocating port: ${error.message}. Using default port.`);
    return BASE_PORT; // Fallback to base port in case of errors
  }
};

/**
 * Release an allocated port when a service shuts down
 * @param {number} pid Process ID
 */
const releasePort = (pid) => {
  try {
    if (!fs.existsSync(PORT_REGISTRY_FILE)) return;
    
    const registry = JSON.parse(fs.readFileSync(PORT_REGISTRY_FILE, 'utf8'));
    
    // Remove the port allocation for this process
    registry.allocatedPorts = registry.allocatedPorts.filter(p => p.pid !== pid);
    
    // Save the updated registry
    fs.writeFileSync(PORT_REGISTRY_FILE, JSON.stringify(registry, null, 2));
    
    logger.info(`Released port allocation for process ${pid}`);
  } catch (error) {
    logger.error(`Error releasing port: ${error.message}`);
  }
};

module.exports = {
  getServerPort,
  releasePort
}; 