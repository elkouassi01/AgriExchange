const mysql = require('mysql2/promise');

let pool;

const getMysqlPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      database: process.env.MYSQL_DATABASE || 'agriexchange',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: parseInt(process.env.MYSQL_POOL_SIZE || '25', 10),
      queueLimit: 100,
      connectTimeout: 10000,
      timezone: '+00:00',
      supportBigNumbers: true,
      bigNumberStrings: false,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
};

const testMysqlConnection = async () => {
  const p = getMysqlPool();
  const conn = await p.getConnection();
  try {
    await conn.query('SELECT 1');
  } finally {
    conn.release();
  }
};

module.exports = { getMysqlPool, testMysqlConnection };
