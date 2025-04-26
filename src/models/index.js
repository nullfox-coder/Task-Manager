const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/pg.db');
const { logger } = require('../utils/logger');

const db = {};

// Read all models in this directory and import them
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== 'index.js' &&
      file.slice(-3) === '.js' &&
      !file.includes('test') &&
      !file.includes('_metadata') // Skip Firestore models
    );
  })
  .forEach(file => {
    try {
      const model = require(path.join(__dirname, file));
      const modelName = path.basename(file, '.js').replace('_model', '');
      
      if (model.name) {
        // If model is a direct Sequelize model
        db[model.name] = model;
      } else if (model.prototype && model.prototype.constructor) {
        // If model is a class
        db[modelName] = model;
      } else {
        // Skip if not a valid model
        logger.warn(`Skipping ${file} - not a valid model`);
      }
    } catch (error) {
      logger.error(`Error loading model from file ${file}:`, error);
    }
  });

// Load custom models that need special handling
try {
  const TaskMetadata = require('./task_metadata.model');
  db.TaskMetadata = TaskMetadata;
} catch (error) {
  logger.error('Error loading TaskMetadata model:', error);
}

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Some basic associations
try {
  if (db.User && db.Task) {
    db.User.hasMany(db.Task, { foreignKey: 'user_id', as: 'tasks' });
    db.Task.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
  }

  if (db.Task) {
    db.Task.hasMany(db.Task, { foreignKey: 'parentId', as: 'children' });
    db.Task.belongsTo(db.Task, { foreignKey: 'parentId', as: 'parent' });
  }
} catch (error) {
  logger.error('Error setting up associations:', error);
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db; 