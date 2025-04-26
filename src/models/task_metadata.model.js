const { getFirestore } = require('../config/firestore.db');
const { logger } = require('../utils/logger');
const admin = require('firebase-admin');

class TaskMetadata {
  static async create(data) {
    try {
      const db = getFirestore();
      const docRef = db.collection('task_metadata').doc(data.task_id);
      await docRef.set({
        task_id: data.task_id,
        owner_id: data.owner_id,
        status: data.status || 'pending',
        created_at: data.created_at || admin.firestore.FieldValue.serverTimestamp(),
        started_at: data.started_at || null,
        completed_at: data.completed_at || null,
        frequency: data.frequency || 0,
        description: data.description || '',
        tags: data.tags || [],
        expected_duration_ms: data.expected_duration_ms || 0,
        resource_requirements: data.resource_requirements || {
          cpu: 1.0,
          memory_mb: 512
        }
      });
      return this.findOne(data.task_id);
    } catch (error) {
      logger.error('Error creating task metadata:', error);
      throw error;
    }
  }

  static async findOne(taskId) {
    try {
      const db = getFirestore();
      const doc = await db.collection('task_metadata').doc(taskId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error('Error finding task metadata:', error);
      throw error;
    }
  }

  static async findAll(filter = {}) {
    try {
      const db = getFirestore();
      let query = db.collection('task_metadata');
      
      if (filter.where) {
        Object.entries(filter.where).forEach(([key, value]) => {
          query = query.where(key, '==', value);
        });
      }
      
      if (filter.order) {
        filter.order.forEach(([field, direction]) => {
          query = query.orderBy(field, direction.toLowerCase());
        });
      }
      
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding task metadata:', error);
      throw error;
    }
  }

  static async update(taskId, data) {
    try {
      const db = getFirestore();
      const docRef = db.collection('task_metadata').doc(taskId);
      await docRef.update({
        ...data,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      return this.findOne(taskId);
    } catch (error) {
      logger.error('Error updating task metadata:', error);
      throw error;
    }
  }

  static async delete(taskId) {
    try {
      const db = getFirestore();
      await db.collection('task_metadata').doc(taskId).delete();
      return true;
    } catch (error) {
      logger.error('Error deleting task metadata:', error);
      throw error;
    }
  }

  static async updateStatus(taskId, status) {
    try {
      const updates = { status };
      
      if (status === 'running') {
        updates.started_at = admin.firestore.FieldValue.serverTimestamp();
      } else if (status === 'completed') {
        updates.completed_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      return this.update(taskId, updates);
    } catch (error) {
      logger.error('Error updating task status:', error);
      throw error;
    }
  }

  static async incrementFrequency(taskId) {
    try {
      const db = getFirestore();
      const docRef = db.collection('task_metadata').doc(taskId);
      await docRef.update({
        frequency: admin.firestore.FieldValue.increment(1)
      });
      return this.findOne(taskId);
    } catch (error) {
      logger.error('Error incrementing frequency:', error);
      throw error;
    }
  }
}

module.exports = TaskMetadata;
