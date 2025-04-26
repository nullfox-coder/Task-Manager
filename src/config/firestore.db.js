const admin = require('firebase-admin');
const { logger } = require('../utils/logger');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let firestoreDb = null;

// Initialize Firebase if not already initialized
const initializeFirestore = () => {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });
      
      firestoreDb = admin.firestore();
      logger.info('Firestore initialized successfully');
      return firestoreDb;
    } catch (error) {
      logger.error('Firebase initialization error:', error);
      throw error;
    }
  } else {
    firestoreDb = admin.firestore();
    return firestoreDb;
  }
};

// Get Firestore instance
const getFirestore = () => {
  if (!firestoreDb) {
    return initializeFirestore();
  }
  return firestoreDb;
};

// Test Firestore connection
const testFirestoreConnection = async () => {
  try {
    const db = getFirestore();
    const testDoc = await db.collection('_test').doc('connection').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    logger.info('Firestore connection test successful');
    return true;
  } catch (error) {
    logger.error('Firestore connection test failed:', error);
    return false;
  }
};

module.exports = {
  getFirestore,
  initializeFirestore,
  testFirestoreConnection
};
