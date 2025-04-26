#!/usr/bin/env node

/**
 * Script to initialize and test database connections
 */

// Load dotenv at the beginning with the correct path
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sequelize, testConnection } = require('../config/pg.db');
const { getFirestore, testFirestoreConnection } = require('../config/firestore.db');
const { logger } = require('../utils/logger');

const initDatabase = async () => {
  try {
    logger.info('Starting database initialization...');
    
    // Test Postgres connection
    logger.info('Testing PostgreSQL connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('Failed to connect to PostgreSQL database');
      return false;
    }
    
    logger.info('PostgreSQL connection successful');
    
    // Sync models with database
    logger.info('Syncing models with database...');
    await sequelize.sync({ 
      alter: process.env.NODE_ENV === 'development',
      force: process.env.DB_FORCE_SYNC === 'true' 
    });
    logger.info('Models synced successfully');
    
    // Test Firestore connection if enabled
    if (process.env.FIREBASE_ENABLED === 'true') {
      logger.info('Testing Firestore connection...');
      const firestoreConnected = await testFirestoreConnection();
      
      if (!firestoreConnected) {
        logger.error('Failed to connect to Firestore database');
        return false;
      }
      
      logger.info('Firestore connection successful');
    } else {
      logger.info('Firestore is disabled, skipping connection test');
    }
    
    logger.info('Database initialization complete');
    return true;
  } catch (error) {
    logger.error('Error during database initialization:', error);
    return false;
  }
};

// Run the function if called directly
if (require.main === module) {
  initDatabase()
    .then(success => {
      if (success) {
        logger.info('Database initialization successful');
        process.exit(0);
      } else {
        logger.error('Database initialization failed');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('Unhandled error during database initialization:', error);
      process.exit(1);
    });
} else {
  // Export for use in other files
  module.exports = { initDatabase };
} 