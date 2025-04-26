const serviceDiscovery = require('./service-discovery');
// Use node-fetch for compatibility
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class LoadBalancer {
  constructor(strategy = 'round-robin') {
    this.strategy = process.env.LOAD_BALANCER_STRATEGY || strategy;
    this.currentIndex = new Map();
    console.log(`Load balancer initialized with strategy: ${this.strategy}`);
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
      
      console.log(`Proxying ${req.method} request to: ${targetUrl}`);

      // Convert headers to plain object (removing host, connection)
      const headers = { ...req.headers };
      delete headers.host;
      delete headers.connection;
      
      // Add forwarded headers
      headers['x-forwarded-for'] = req.ip;
      headers['x-forwarded-host'] = req.hostname;
      headers['content-type'] = 'application/json';

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        res.status(response.status).json(data);
      } else {
        const text = await response.text();
        res.status(response.status).send(text);
      }
    } catch (error) {
      console.error('Load balancing error:', error);
      res.status(503).json({ 
        message: 'Service unavailable',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new LoadBalancer();
