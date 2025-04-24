const lfuCache = require('./lfu.cache');
const { logger } = require('../utils/logger');

class CacheService {
  constructor() {
    this.cache = lfuCache;
  }

  async getTask(taskId, userId) {
    const cacheKey = this._getCacheKey(taskId, userId);
    return await this.cache.get(cacheKey);
  }

  async setTask(task, userId) {
    const cacheKey = this._getCacheKey(task.id, userId);
    await this.cache.set(cacheKey, task);
    logger.info(`Task cached: ${task.id}`);
  }

  async deleteTask(taskId, userId) {
    const cacheKey = this._getCacheKey(taskId, userId);
    await this.cache.delete(cacheKey);
    logger.info(`Task removed from cache: ${taskId}`);
  }

  async clearUserTasks(userId) {
    const pattern = this._getCacheKey('*', userId);
    const keys = await this.cache.redis.keys(pattern);
    if (keys.length > 0) {
      await this.cache.redis.del(...keys);
    }
    logger.info(`Cleared cache for user: ${userId}`);
  }

  async getCacheStats() {
    return await this.cache.getStats();
  }

  async getMostFrequentTasks(userId, limit = 10) {
    try {
      const pipeline = this.cache.redis.pipeline();
      const pattern = this._getCacheKey('*', userId);
      
      // Get all user's task keys
      const keys = await this.cache.redis.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }

      // Get frequencies for all keys
      for (const key of keys) {
        const taskId = key.split(':').pop();
        pipeline.zscore('frequencies', taskId);
      }
      
      const results = await pipeline.exec();
      
      // Create a map of task IDs to frequencies
      const taskFrequencies = new Map();
      for (let i = 0; i < results.length; i++) {
        const [error, frequency] = results[i];
        if (!error && frequency) {
          const taskId = keys[i].split(':').pop();
          taskFrequencies.set(taskId, parseInt(frequency));
        }
      }
      
      // Sort by frequency and get top N
      const sortedTasks = Array.from(taskFrequencies.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
      
      // Get the actual task data
      const tasks = [];
      for (const [taskId, frequency] of sortedTasks) {
        const task = await this.cache.get(taskId);
        if (task) {
          tasks.push({
            ...task,
            frequency
          });
        }
      }
      
      return tasks;
    } catch (error) {
      logger.error('Error getting most frequent tasks:', error);
      return [];
    }
  }

  _getCacheKey(taskId, userId) {
    return `user:${userId}:task:${taskId}`;
  }
}

module.exports = new CacheService();
