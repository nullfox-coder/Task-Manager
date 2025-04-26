// Load dotenv at the very beginning
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

console.log('DATABASE_URL is:', process.env.DATABASE_URL);

let sequelize;

// Check if we have a DATABASE_URL (Neon DB)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // This is needed for self-signed certificates
      },
      keepAlive: true
    },
    pool: {
      max: 3, // Reducing max connections for managed services
      min: 0,
      acquire: 30000,
      idle: 10000,
      evict: 1000
    },
    retry: {
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
        /SequelizeConnectionAcquireTimeoutError/
      ],
      max: 5
    }
  });
} else {
  // Fallback to conventional connection parameters
  console.log('Using conventional database parameters');
  
  sequelize = new Sequelize(
    process.env.DB_NAME || 'taskdb',
    process.env.DB_USER || 'user',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    // More detailed error information
    if (error.original) {
      console.error('Original error:', error.original.code, error.original.message);
    }
    return false;
  }
};

// Call testConnection immediately to verify
testConnection().catch(err => {
  console.error('Failed to test database connection:', err);
});

module.exports = { sequelize, testConnection };
