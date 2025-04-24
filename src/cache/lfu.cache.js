const Redis = require('ioredis');
const { logger } = require('../utils/logger');

class LFUCache {
  constructor(maxSize = 10) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    });
    this.maxSize = maxSize;
    this.prefix = 'task:';
  }

  async get(key) {
    try {
      const data = await this.redis.get(`${this.prefix}${key}`);
      if (data) {
        // Increment frequency
        await this.redis.zincrby('frequencies', 1, key);
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.error('Error getting from cache:', error);
      return null;
    }
  }

  async set(key, value) {
    try {
      // Check if we need to evict
      const count = await this.redis.zcard('frequencies');
      if (count >= this.maxSize) {
        await this.evict();
      }

      // Set the value
      await this.redis.set(`${this.prefix}${key}`, JSON.stringify(value));
      
      // Initialize frequency if not exists
      const exists = await this.redis.zscore('frequencies', key);
      if (!exists) {
        await this.redis.zadd('frequencies', 1, key);
      }
    } catch (error) {
      logger.error('Error setting cache:', error);
    }
  }

  async evict() {
    try {
      // Get the least frequently used key
      const lfuKey = await this.redis.zrange('frequencies', 0, 0);
      if (lfuKey.length > 0) {
        // Remove from both the value store and frequency tracking
        await this.redis.del(`${this.prefix}${lfuKey[0]}`);
        await this.redis.zrem('frequencies', lfuKey[0]);
        logger.info(`Evicted key from cache: ${lfuKey[0]}`);
      }
    } catch (error) {
      logger.error('Error evicting from cache:', error);
    }
  }

  async delete(key) {
    try {
      await this.redis.del(`${this.prefix}${key}`);
      await this.redis.zrem('frequencies', key);
    } catch (error) {
      logger.error('Error deleting from cache:', error);
    }
  }

  async clear() {
    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      await this.redis.del('frequencies');
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  async getStats() {
    try {
      const count = await this.redis.zcard('frequencies');
      const frequencies = await this.redis.zrange('frequencies', 0, -1, 'WITHSCORES');
      return {
        count,
        frequencies: frequencies.reduce((acc, curr, i) => {
          if (i % 2 === 0) {
            acc[curr] = frequencies[i + 1];
          }
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return null;
    }
  }

  async getMostFrequent(limit = 10) {
    try {
      const pipeline = this.redis.pipeline();
      
      // Get the most frequent keys with scores
      const frequentKeys = await this.redis.zrevrange('frequencies', 0, limit - 1, 'WITHSCORES');
      
      // Queue up all the get commands
      for (let i = 0; i < frequentKeys.length; i += 2) {
        const key = frequentKeys[i];
        pipeline.get(`${this.prefix}${key}`);
      }
      
      // Execute all commands in one round trip
      const results = await pipeline.exec();
      
      // Process results
      const tasks = [];
      for (let i = 0; i < results.length; i++) {
        const [error, value] = results[i];
        if (!error && value) {
          const key = frequentKeys[i * 2];
          const frequency = frequentKeys[i * 2 + 1];
          tasks.push({
            ...JSON.parse(value),
            frequency: parseInt(frequency)
          });
        }
      }
      
      return tasks;
    } catch (error) {
      logger.error('Error getting most frequent items:', error);
      return [];
    }
  }
}

module.exports = new LFUCache();
