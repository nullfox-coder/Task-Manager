const { Task, TaskMetadata } = require('../../models');
const { TaskQueue } = require('../../services/task-queue');
const cacheService = require('../../cache/cache.service');
const { logger } = require('../../utils/logger');

class TaskController {
  constructor() {
    this.taskQueue = new TaskQueue();
  }

  async createTask(req, res) {
    try {
      const { title, description, priority, due_date } = req.body;
      const userId = req.user.id;

      // Create task in PostgreSQL
      const task = await Task.create({
        title,
        description,
        priority,
        due_date,
        status: 'pending',
        owner_id: userId
      });

      // Enqueue task
      await this.taskQueue.enqueue({
        taskId: task.id,
        userId,
        metadata: {
          created_at: new Date(),
          status: 'pending',
          frequency: 0
        }
      });

      logger.info(`Task created and enqueued: ${task.id}`);
      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create task'
      });
    }
  }

  async getTasks(req, res) {
    try {
      const userId = req.user.id;
      const tasks = await Task.findAll({
        where: { owner_id: userId },
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      logger.error('Error fetching tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tasks'
      });
    }
  }

  async getFrequentTasks(req, res) {
    try {
      const userId = req.user.id;
      
      // Try to get from cache first
      const cachedFrequentTasks = await cacheService.getMostFrequentTasks(userId);
      
      if (cachedFrequentTasks.length > 0) {
        logger.info('Returning frequent tasks from cache');
        return res.json({
          success: true,
          data: cachedFrequentTasks,
          fromCache: true
        });
      }

      // Fallback to database if cache is empty
      const frequentTasks = await TaskMetadata.findAll({
        where: { owner_id: userId },
        order: [['frequency', 'DESC']],
        limit: 10
      });

      const taskIds = frequentTasks.map(task => task.task_id);
      const tasks = await Task.findAll({
        where: { id: taskIds }
      });

      // Cache the results
      for (const task of tasks) {
        await cacheService.setTask(task, userId);
      }

      res.json({
        success: true,
        data: tasks,
        fromCache: false
      });
    } catch (error) {
      logger.error('Error fetching frequent tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch frequent tasks'
      });
    }
  }

  async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = await Task.findOne({
        where: { id, owner_id: userId }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Update frequency in Firestore
      await TaskMetadata.incrementFrequency(id);

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('Error fetching task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch task'
      });
    }
  }

  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const task = await Task.findOne({
        where: { id, owner_id: userId }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      await task.update(updates);

      // Update Firestore metadata if status changed
      if (updates.status) {
        await TaskMetadata.updateStatus(id, updates.status);
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update task'
      });
    }
  }

  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = await Task.findOne({
        where: { id, owner_id: userId }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      await task.destroy();
      await TaskMetadata.delete(id);

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete task'
      });
    }
  }
}

module.exports = new TaskController();
