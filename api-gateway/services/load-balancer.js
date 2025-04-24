const serviceDiscovery = require('./service-discovery');

class LoadBalancer {
  constructor(strategy = 'round-robin') {
    this.strategy = strategy;
    this.currentIndex = new Map();
  }

  getNextService(serviceName) {
    const services = serviceDiscovery.getAllServices()
      .filter(([name, service]) => name === serviceName && service.isHealthy)
      .map(([_, service]) => service);

    if (services.length === 0) {
      throw new Error(`No healthy instances available for service: ${serviceName}`);
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobin(services, serviceName);
      case 'random':
        return this.random(services);
      default:
        return this.roundRobin(services, serviceName);
    }
  }

  roundRobin(services, serviceName) {
    const index = (this.currentIndex.get(serviceName) || 0) % services.length;
    this.currentIndex.set(serviceName, index + 1);
    return services[index];
  }

  random(services) {
    const index = Math.floor(Math.random() * services.length);
    return services[index];
  }

  async proxyRequest(req, res, serviceName, path) {
    try {
      const service = this.getNextService(serviceName);
      const targetUrl = `${service.url}${path}`;

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          ...req.headers,
          'x-forwarded-for': req.ip,
          'x-forwarded-host': req.hostname
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Load balancing error:', error);
      res.status(500).json({ 
        message: 'Service unavailable',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new LoadBalancer();
