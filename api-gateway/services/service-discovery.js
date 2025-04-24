const EventEmitter = require('events');

class ServiceDiscovery extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
  }

  registerService(serviceName, serviceUrl) {
    const service = {
      url: serviceUrl,
      lastHealthCheck: Date.now(),
      isHealthy: true
    };
    this.services.set(serviceName, service);
    this.emit('serviceRegistered', { serviceName, serviceUrl });
  }

  unregisterService(serviceName) {
    this.services.delete(serviceName);
    this.emit('serviceUnregistered', { serviceName });
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
      const response = await fetch(`${service.url}/health`);
      const data = await response.json();
      
      service.isHealthy = response.ok && data.status === 'ok';
      service.lastHealthCheck = Date.now();
      
      if (!service.isHealthy) {
        this.emit('serviceUnhealthy', { serviceName, serviceUrl: service.url });
      }
      
      return service.isHealthy;
    } catch (error) {
      service.isHealthy = false;
      this.emit('serviceUnhealthy', { serviceName, serviceUrl: service.url, error });
      return false;
    }
  }

  startHealthChecks() {
    setInterval(async () => {
      for (const [serviceName] of this.services) {
        await this.checkServiceHealth(serviceName);
      }
    }, this.healthCheckInterval);
  }
}

module.exports = new ServiceDiscovery();
