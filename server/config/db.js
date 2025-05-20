const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'production_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
const testConnection = async () => {
  try {
    console.log(`Attempting to connect to PostgreSQL database at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432} - DB: ${process.env.DB_NAME || 'production_db'}`);
    const client = await pool.connect();
    console.log('PostgreSQL database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL database connection error:', error);
    console.error('Connection details used:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'production_db',
      user: process.env.DB_USER || 'postgres'
    });
    return false;
  }
};


module.exports = {
  pool,
  testConnection
};