// test-db.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('pg');

console.log('Testing direct connection to Neon DB');
console.log('DATABASE_URL is defined:', !!process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Current time on database:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();