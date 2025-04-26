/**
 * Service Registration Utility
 * Handles service registration with the service discovery system
 */
const axios = require('axios');
const { logger } = require('./logger');

/**
 * Register a service with the service discovery system
 * @param {Object} serviceInfo - Information about the service to register
 * @param {string} serviceInfo.name - Name of the service
 * @param {string} serviceInfo.host - Host of the service
 * @param {number} serviceInfo.port - Port of the service
 * @returns {Promise<boolean>} - True if registration is successful
 */
const registerService = async (serviceInfo) => {
  try {
    // Get service discovery URL from environment or use default
    const serviceDiscoveryUrl = process.env.SERVICE_DISCOVERY_URL || 'http://localhost:3000/api/services/register';
    
    // Register the service
    const response = await axios.post(serviceDiscoveryUrl, serviceInfo);
    
    if (response.status === 200 || response.status === 201) {
      logger.info(`Successfully registered service: ${serviceInfo.name} at ${serviceInfo.host}:${serviceInfo.port}`);
      
      // Start health check reporting
      startHealthChecks(serviceInfo);
      
      return true;
    } else {
      logger.error(`Failed to register service: ${response.status} - ${response.data}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error registering service: ${error.message}`);
    
    // Retry registration after delay
    setTimeout(() => {
      logger.info('Retrying service registration...');
      registerService(serviceInfo);
    }, 5000);
    
    return false;
  }
};

/**
 * Start sending health check updates to service discovery
 * @param {Object} serviceInfo - Information about the service
 */
const startHealthChecks = (serviceInfo) => {
  const healthCheckInterval = process.env.HEALTH_CHECK_INTERVAL || 30000; // Default: 30 seconds
  const serviceDiscoveryHealthUrl = process.env.SERVICE_DISCOVERY_HEALTH_URL || 'http://localhost:3000/api/services/health';
  
  // Set up interval to send health updates
  setInterval(async () => {
    try {
      const healthData = {
        name: serviceInfo.name,
        host: serviceInfo.host,
        port: serviceInfo.port,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
      
      await axios.post(serviceDiscoveryHealthUrl, healthData);
      logger.debug(`Health check sent for ${serviceInfo.name}`);
    } catch (error) {
      logger.error(`Failed to send health check: ${error.message}`);
    }
  }, healthCheckInterval);
  
  logger.info(`Health checks started with interval of ${healthCheckInterval}ms`);
};

module.exports = {
  registerService
}; 