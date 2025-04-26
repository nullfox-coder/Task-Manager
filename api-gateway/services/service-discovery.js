const EventEmitter = require('events');
// Use node-fetch for compatibility
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class ServiceDiscovery extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.healthCheckInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000; // 30 seconds
  }

  registerService(serviceName, serviceUrl) {
    const service = {
      url: serviceUrl,
      lastHealthCheck: Date.now(),
      isHealthy: true
    };
    this.services.set(serviceName, service);
    this.emit('serviceRegistered', { serviceName, serviceUrl });
    console.log(`Service registered: ${serviceName} at ${serviceUrl}`);
  }

  unregisterService(serviceName) {
    this.services.delete(serviceName);
    this.emit('serviceUnregistered', { serviceName });
    console.log(`Service unregistered: ${serviceName}`);
  }

  getService(serviceName) {
    return this.services.get(serviceName);
  }

  getAllServices() {
    return Array.from(this.services.entries());
  }

  async checkServiceHealth(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return false;

    try {
      console.log(`Checking health for ${serviceName} at ${service.url}/health`);
      const response = await fetch(`${service.url}/health`);
      const data = await response.json();
      
      service.isHealthy = response.ok && (data.status === 'UP' || data.status === 'ok');
      service.lastHealthCheck = Date.now();
      
      if (!service.isHealthy) {
        console.warn(`Service ${serviceName} is unhealthy`);
        this.emit('serviceUnhealthy', { serviceName, serviceUrl: service.url });
      } else {
        console.log(`Service ${serviceName} is healthy`);
      }
      
      return service.isHealthy;
    } catch (error) {
      console.error(`Health check failed for ${serviceName}:`, error.message);
      service.isHealthy = false;
      this.emit('serviceUnhealthy', { serviceName, serviceUrl: service.url, error });
      return false;
    }
  }

  startHealthChecks() {
    console.log(`Starting health checks at interval: ${this.healthCheckInterval}ms`);
    setInterval(async () => {
      for (const [serviceName] of this.services) {
        await this.checkServiceHealth(serviceName);
      }
    }, this.healthCheckInterval);
  }
}

module.exports = new ServiceDiscovery();
