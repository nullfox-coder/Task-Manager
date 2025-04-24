const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../../middleware/auth');
const cacheMiddleware = require('../middleware/cache.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Create a new task
router.post('/', cacheMiddleware.clearUserCache, taskController.createTask);

// Get all tasks
router.get('/', taskController.getTasks);

// Get frequent tasks
router.get('/frequent', taskController.getFrequentTasks);

// Get task by ID
router.get('/:id', 
  cacheMiddleware.getTask,
  taskController.getTaskById,
  cacheMiddleware.cacheTask
);

// Update task
router.patch('/:id', 
  cacheMiddleware.invalidateTask,
  taskController.updateTask,
  cacheMiddleware.cacheTask
);

// Delete task
router.delete('/:id', 
  cacheMiddleware.invalidateTask,
  taskController.deleteTask
);

module.exports = router;
