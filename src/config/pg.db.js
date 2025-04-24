require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

// Create a connection pool
const sql = neon(process.env.DATABASE_URL);

// Test the connection
const testConnection = async () => {
  try {
    const result = await sql`SELECT version()`;
    console.log('Neon database connection has been established successfully.');
    console.log('PostgreSQL version:', result[0].version);
  } catch (err) {
    console.error('Unable to connect to Neon database:', err);
  }
};

testConnection();

module.exports = sql;
