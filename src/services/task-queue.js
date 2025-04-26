const { Task, TaskMetadata } = require('../models');
const { logger } = require('../utils/logger');

class TaskQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async enqueue(taskData) {
    this.queue.push(taskData);
    logger.info(`Task enqueued: ${taskData.taskId}`);

    if (!this.isProcessing) {
      this.processQueue();
    }

    return taskData.taskId;
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const taskData = this.queue.shift();
      try {
        await this.processTask(taskData);
      } catch (error) {
        logger.error(`Error processing task ${taskData.taskId}:`, error);
      }
    }

    this.isProcessing = false;
  }

  async processTask(taskData) {
    const { taskId, userId, metadata } = taskData;

    try {
      // Update task status to running
      await Task.update(
        { status: 'running' },
        { where: { id: taskId } }
      );

      // Create initial metadata in Firestore
      await TaskMetadata.create({
        task_id: taskId,
        owner_id: userId,
        status: 'running',
        created_at: metadata.created_at,
        started_at: new Date(),
        frequency: metadata.frequency
      });

      // Simulate task processing
      await this.simulateTaskProcessing();

      // Update task status to completed
      await Task.update(
        { status: 'completed' },
        { where: { id: taskId } }
      );

      // Update metadata in Firestore
      await TaskMetadata.updateStatus(taskId, 'completed');

      logger.info(`Task completed: ${taskId}`);
    } catch (error) {
      // Update task status to failed
      await Task.update(
        { status: 'failed' },
        { where: { id: taskId } }
      );

      // Update metadata in Firestore
      await TaskMetadata.updateStatus(taskId, 'failed');

      throw error;
    }
  }

  async simulateTaskProcessing() {
    // Simulate task processing time (1-5 seconds)
    const processingTime = Math.floor(Math.random() * 4000) + 1000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }
}

module.exports = { TaskQueue }; 