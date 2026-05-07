require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getMysqlPool, testMysqlConnection } = require('../config/mysql');

const schemaPath = path.join(__dirname, '..', 'sql', 'mysql-schema.sql');

const run = async () => {
  try {
    await testMysqlConnection();
    console.log('MySQL connection OK');

    // Strip comment lines before splitting so they don't mask CREATE TABLE statements
    const sql = fs.readFileSync(schemaPath, 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');

    const pool = getMysqlPool();

    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await pool.query(statement);
    }

    console.log('MySQL schema initialized successfully.');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize MySQL schema:', error.message);
    process.exit(1);
  }
};

run();
