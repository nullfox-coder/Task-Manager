const cacheService = require('../../cache/cache.service');
const { logger } = require('../../utils/logger');

const cacheMiddleware = {
  async getTask(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Try to get from cache
      const cachedTask = await cacheService.getTask(id, userId);
      if (cachedTask) {
        logger.info(`Cache hit for task: ${id}`);
        return res.json({
          success: true,
          data: cachedTask,
          fromCache: true
        });
      }

      logger.info(`Cache miss for task: ${id}`);
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  },

  async cacheTask(req, res, next) {
    try {
      const task = res.locals.task;
      if (task) {
        await cacheService.setTask(task, req.user.id);
      }
      next();
    } catch (error) {
      logger.error('Error caching task:', error);
      next();
    }
  },

  async invalidateTask(req, res, next) {
    try {
      const { id } = req.params;
      await cacheService.deleteTask(id, req.user.id);
      next();
    } catch (error) {
      logger.error('Error invalidating cache:', error);
      next();
    }
  },

  async clearUserCache(req, res, next) {
    try {
      await cacheService.clearUserTasks(req.user.id);
      next();
    } catch (error) {
      logger.error('Error clearing user cache:', error);
      next();
    }
  }
};

module.exports = cacheMiddleware;
