require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getPostgresPool, testPostgresConnection } = require('../config/postgres');

const schemaPath = path.join(__dirname, '..', 'sql', 'postgres-schema.sql');

const run = async () => {
  try {
    await testPostgresConnection();
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const pool = getPostgresPool();
    await pool.query(sql);
    console.log('PostgreSQL schema initialized successfully.');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize PostgreSQL schema:', error.message);
    process.exit(1);
  }
};

run();
