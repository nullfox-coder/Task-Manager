const { getFirestore } = require('../config/firestore.db');

class TaskMetadata {
  constructor(data = {}) {
    this.description = data.description || '';
    this.created_by = data.created_by || '';
    this.default_priority = data.default_priority || 0;
    this.expected_duration_ms = data.expected_duration_ms || 0;
    this.default_parameters = data.default_parameters || {};
    this.tags = data.tags || [];
    this.is_deprecated = data.is_deprecated || false;
    this.version = data.version || '1.0';
    this.max_retries = data.max_retries || 3;
    this.timeout_ms = data.timeout_ms || 300000; // 5 minutes default
    this.resource_requirements = data.resource_requirements || {
      cpu: 1.0,
      memory_mb: 512
    };
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  static async get(taskName) {
    const db = getFirestore();
    const doc = await db.collection('task_metadata').doc(taskName).get();
    if (!doc.exists) {
      return null;
    }
    return new TaskMetadata(doc.data());
  }

  async save(taskName) {
    const db = getFirestore();
    this.updated_at = new Date();
    await db.collection('task_metadata').doc(taskName).set({
      ...this,
      created_at: this.created_at,
      updated_at: this.updated_at
    });
  }

  static async delete(taskName) {
    const db = getFirestore();
    await db.collection('task_metadata').doc(taskName).delete();
  }
}

module.exports = TaskMetadata;
