const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const createPostgresPool = () => {
  if (!connectionString) {
    throw new Error('POSTGRES_URL or DATABASE_URL is missing');
  }

  // Parser l'URL pour extraire les composants
  const url = new URL(connectionString);
  
  return new Pool({
    host: url.hostname,
    port: url.port || 5432,
    database: url.pathname.substring(1) || 'postgres',
    user: url.username || 'postgres',
    password: url.password || '',
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
};

let pool;

const getPostgresPool = () => {
  if (!pool) {
    pool = createPostgresPool();
  }

  return pool;
};

const testPostgresConnection = async () => {
  const activePool = getPostgresPool();
  const client = await activePool.connect();

  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
};

module.exports = {
  getPostgresPool,
  testPostgresConnection,
};
